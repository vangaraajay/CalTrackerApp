import json
import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase = create_client(
    os.environ.get('DB_API_URL'),
    os.environ.get('DB_API_KEY')
)

def lambda_handler(event, context):
    """Main Lambda handler for Bedrock Agent tools"""
    print(f'Event: {json.dumps(event, indent=2)}')
    
    function_name = event.get('function')
    parameters = event.get('parameters', {})
    
    try:
        if function_name == 'add_meal':
            return add_meal(parameters)
        elif function_name == 'delete_meal':
            return delete_meal(parameters)
        elif function_name == 'modify_meal':
            return modify_meal(parameters)
        elif function_name == 'get_meals':
            return get_meals(parameters)
        else:
            return create_response("Function not found")
    except Exception as error:
        print(f'Error: {error}')
        return create_response(f"Error: {str(error)}")

def add_meal(params):
    """Add a meal to the database"""
    user_id = params.get('user_id', 'default-user')
    
    response = supabase.table('Meals').insert({
        'user_id': user_id,
        'name': params.get('name'),
        'calories': params.get('calories'),
        'protein': params.get('protein'),
        'carbs': params.get('carbs'),
        'fat': params.get('fat')
    }).execute()
    
    return create_response(f"Added {params.get('name')} with {params.get('calories')} calories")

def delete_meal(params):
    """Delete a meal by ID"""
    meal_id = params.get('meal_id')
    
    response = supabase.table('Meals').delete().eq('id', meal_id).execute()
    
    return create_response(f"Deleted meal with ID {meal_id}")

def modify_meal(params):
    """Modify an existing meal"""
    meal_id = params.get('meal_id')
    
    update_data = {}
    if params.get('name'):
        update_data['name'] = params.get('name')
    if params.get('calories'):
        update_data['calories'] = params.get('calories')
    if params.get('protein'):
        update_data['protein'] = params.get('protein')
    if params.get('carbs'):
        update_data['carbs'] = params.get('carbs')
    if params.get('fat'):
        update_data['fat'] = params.get('fat')
    
    response = supabase.table('Meals').update(update_data).eq('id', meal_id).execute()
    
    return create_response(f"Modified meal with ID {meal_id}")

def get_meals(params):
    """Get today's meals for a user"""
    user_id = params.get('user_id', 'default-user')
    today = datetime.now().strftime('%Y-%m-%d')
    
    response = supabase.table('Meals').select('id, name, calories, protein, carbs, fat, created_at').eq('user_id', user_id).gte('created_at', f'{today}T00:00:00').lt('created_at', f'{today}T23:59:59').execute()
    
    if not response.data:
        return create_response("No meals found for today")
    
    meals_text = "Today's meals:\n"
    for meal in response.data:
        meals_text += f"ID: {meal['id']} - {meal['name']}: {meal['calories']} cal, {meal['protein']}g protein, {meal['carbs']}g carbs, {meal['fat']}g fat\n"
    
    return create_response(meals_text)

def create_response(message):
    """Create standardized response for Bedrock Agent"""
    return {
        'response': {
            'actionGroup': 'meal-functions',
            'function': 'tool_response',
            'functionResponse': {
                'responseBody': {
                    'TEXT': {
                        'body': message
                    }
                }
            }
        }
    }