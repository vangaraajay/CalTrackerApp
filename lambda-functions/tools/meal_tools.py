import json
import os
from datetime import datetime, timezone
from supabase import create_client

# Initialize Supabase client
supabase = create_client(
    os.environ.get('DB_API_URL'),
    os.environ.get('DB_API_KEY')
)

def lambda_handler(event, context):
    """Main Lambda handler for Bedrock Agent tools"""
    print(f'Event: {json.dumps(event, indent=2)}')

    api_path = event.get("apiPath")
    action_group = event.get("actionGroup")
    http_method = event.get("httpMethod", "POST")
    parameters = event.get("parameters", {})

    try:
        # Determine which tool to call based on apiPath
        if api_path == "/addMeal":
            message = add_meal(parameters)
        elif api_path == "/deleteMeal":
            message = delete_meal(parameters)
        elif api_path == "/modifyMeal":
            message = modify_meal(parameters)
        elif api_path == "/getMeals":
            message = get_meals(parameters)
        else:
            message = "Function not found"

        resp = create_response(message, api_path, action_group, http_method, status_code=200)
        print("FINAL RESPONSE:", json.dumps(resp, indent=2))
        return resp

    except Exception as e:
        # Always return the proper structure, even on error
        return create_response(f"Error: {str(e)}", api_path, action_group, http_method, status_code=500)


def add_meal(params):
    response = supabase.table("Meals").insert({
        "meal_name": params.get("name"),
        "calories": params.get("calories"),
        "protein": params.get("protein"),
        "carbs": params.get("carbs"),
        "fat": params.get("fat")
    }).execute()
    return f"Added {params.get('name')} with {params.get('calories')} calories"


def delete_meal(params):
    meal_id = params.get("meal_id")
    supabase.table("Meals").delete().eq("id", meal_id).execute()
    return f"Deleted meal with ID {meal_id}"


def modify_meal(params):
    meal_id = params.get("meal_id")
    update_data = {}
    if params.get("name"): update_data["meal_name"] = params.get("name")
    if params.get("calories"): update_data["calories"] = params.get("calories")
    if params.get("protein"): update_data["protein"] = params.get("protein")
    if params.get("carbs"): update_data["carbs"] = params.get("carbs")
    if params.get("fat"): update_data["fat"] = params.get("fat")
    supabase.table("Meals").update(update_data).eq("id", meal_id).execute()
    return f"Modified meal with ID {meal_id}"


def get_meals(params):
    today_utc = datetime.now(timezone.utc)
    start_of_day = today_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = today_utc.replace(hour=23, minute=59, second=59, microsecond=999999)

    response = supabase.table("Meals")\
        .select("id, meal_name, calories, protein, carbs, fat, created_at")\
        .gte("created_at", start_of_day.isoformat())\
        .lte("created_at", end_of_day.isoformat())\
        .execute()

    if not response.data:
        return "No meals found for today"

    text = "Today's meals:\n"
    for meal in response.data:
        text += f"ID: {meal['id']} - {meal['meal_name']}: {meal['calories']} cal, {meal['protein']}g protein, {meal['carbs']}g carbs, {meal['fat']}g fat\n"
    return text


def create_response(message, api_path, action_group, http_method, status_code=200):
    """Return the exact format Bedrock expects"""
    return {
        "messageVersion": "1.0",
        "response": {
            "actionGroup": action_group,
            "apiPath": api_path,
            "httpMethod": http_method,
            "httpStatusCode": status_code,
            "responseBody": {
                "application/json": {
                    "body": message  # plain text or JSON-stringified text
                }
            }
        },
        "sessionAttributes": {},
        "promptSessionAttributes": {}
    }
'''
if __name__ == "__main__":
    # Test all 4 tools locally
    print("=== Testing add_meal ===")
    test_event = {
        'function': 'add_meal',
        'parameters': {
            'name': 'Test Chicken',
            'calories': 300,
            'protein': 30,
            'carbs': 5,
            'fat': 10
        }
    }
    result = lambda_handler(test_event, None)
    print(result['response']['functionResponse']['responseBody']['TEXT']['body'])
    
    print("\n=== Testing get_meals ===")
    test_event = {
        'function': 'get_meals',
        'parameters': {}
    }
    result = lambda_handler(test_event, None)
    meals_response = result['response']['functionResponse']['responseBody']['TEXT']['body']
    print(meals_response)

    # Extract meal ID for modify/delete tests (assuming format "ID: X - ...")
    if "ID:" in meals_response:
        meal_id = meals_response.split("ID: ")[1].split(" ")[0]
        
        print(f"\n=== Testing modify_meal (ID: {meal_id}) ===")
        test_event = {
            'function': 'modify_meal',
            'parameters': {
                'meal_id': int(meal_id),
                'name': 'Modified Chicken',
                'calories': 350
            }
        }
        result = lambda_handler(test_event, None)
        print(result['response']['functionResponse']['responseBody']['TEXT']['body'])
        
        print("\n=== Testing get_meals after modify ===")
        test_event = {
            'function': 'get_meals',
            'parameters': {}
        }
        result = lambda_handler(test_event, None)
        print(result['response']['functionResponse']['responseBody']['TEXT']['body'])

        print(f"\n=== Testing delete_meal (ID: {meal_id}) ===")
        test_event = {
            'function': 'delete_meal',
            'parameters': {
                'meal_id': int(meal_id)
            }
        }
        result = lambda_handler(test_event, None)
        print(result['response']['functionResponse']['responseBody']['TEXT']['body'])
        
        print("\n=== Testing get_meals after delete ===")
        test_event = {
            'function': 'get_meals',
            'parameters': {}
        }
        result = lambda_handler(test_event, None)
        print(result['response']['functionResponse']['responseBody']['TEXT']['body'])
    else:
        print("\nNo meals found to test modify/delete")
'''