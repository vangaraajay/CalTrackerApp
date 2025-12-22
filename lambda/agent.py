import uuid
import boto3
import json
import re
import os
from datetime import datetime, timezone
from supabase import create_client
from langchain_aws import ChatBedrockConverse
from langchain.agents import create_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain.messages import HumanMessage
from langchain.tools import tool
from dotenv import load_dotenv

#ADD INPUT SANITATION LATER HERE
def validate_input(raw_input):
    return raw_input, None

load_dotenv()
SUPABASE_URL = os.environ["DB_API_URL"]
SUPABASE_KEY = os.environ["DB_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@tool
def add_meal(
    name: str,
    calories: int,
    protein: int | None = None,
    carbs: int | None = None,
    fat: int | None = None
):
    """Add a meal to the daily meal tracker"""
    response = supabase.table('Meals').insert({
        'meal_name': name,
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fat': fat
    }).execute()
    
    return response

@tool
def delete_meal(meal_id):
    """Delete a meal by ID"""
    response = supabase.table('Meals').delete().eq('id', meal_id).execute()
    return response

@tool
def modify_meal(
    meal_id,
    name: str | None = None,
    calories: int | None = None,
    protein: int | None = None,
    carbs: int | None = None,
    fat: int | None = None
):
    """Modify an existing meal"""
    
    update_data = {}
    if name:
        update_data['meal_name'] = name
    if calories:
        update_data['calories'] = calories
    if protein:
        update_data['protein'] = protein
    if carbs:
        update_data['carbs'] = carbs
    if fat:
        update_data['fat'] = fat
    
    response = supabase.table('Meals').update(update_data).eq('id', meal_id).execute()
    
    return response

@tool
def get_meals():
    """Get today's meals"""
    today_utc = datetime.now(timezone.utc)
    start_of_day = today_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = today_utc.replace(hour=23, minute=59, second=59, microsecond=999999)

    response = supabase.table('Meals')\
        .select('id, meal_name, calories, protein, carbs, fat, created_at')\
        .gte('created_at', start_of_day.isoformat())\
        .lte('created_at', end_of_day.isoformat())\
        .execute()

    if not response.data:
        return "No meals found for today"
    return response
'''
    meals_text = "Today's meals:\n"
    for meal in response.data:
        meals_text += f"ID: {meal['id']} - {meal['meal_name']}: {meal['calories']} cal, {meal['protein']}g protein, {meal['carbs']}g carbs, {meal['fat']}g fat\n"
'''

# Initialize Bedrock LLM
llm = ChatBedrockConverse(
    model="anthropic.claude-3-haiku-20240307-v1:0",
    #anthropic.claude-3-haiku-20240307-v1:0
    region_name="us-east-2"
)

# Create prompt template
prompt = (
    "You are an agent that helps people track their calories and macros. "
    "You will assist in lookup for calorie count, protein, fat, and carb content. "
    "You will also be able to add, edit, and remove meals from their daily meal tracker."
)

# Define your tools list (same as before)
tools = [add_meal, get_meals, delete_meal, modify_meal]

# Create the agent with create_agent
agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt=prompt  # you can also pass a string here
)

def lambda_handler(event, context):
    try:
        # Parse the JSON string into a Python dictionary
        body = json.loads(event['body'])
        
        # Validate input
        raw_message = body.get('message', '')
        clean_message, error = validate_input(raw_message)
        
        if error:
            return {
                'statusCode': 400,
                'body': json.dumps(error)
            }
        
        response = agent_executor.invoke({"input": clean_message})
        output = response['output']
        return {
            'statusCode': 200,
            'body': json.dumps(output)
        }
    except Exception as err:
        return {
            'statusCode': 500,
            'body': json.dumps(str(err))
        }
    
def main():
    print("=== Calorie Tracker Agent Test ===")
    while True:
        user_input = input("\nYou: ")
        if user_input.lower() in ["exit", "quit"]:
            print("Exiting agent.")
            break

        # Wrap user input in a HumanMessage
        response = agent.invoke(
            {"messages": [HumanMessage(content=user_input)]}
        )

        # Print the agent's response
        print(f"Agent: {response}")

if __name__ == "__main__":
    main()
