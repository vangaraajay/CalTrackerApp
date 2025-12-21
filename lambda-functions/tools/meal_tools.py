import json
import os
from datetime import datetime, timezone
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
    
    function_name = event.get('name')
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
    response = supabase.table('Meals').insert({
        'meal_name': params.get('name'),
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
        update_data['meal_name'] = params.get('name')
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
        return create_response("No meals found for today")

    meals_text = "Today's meals:\n"
    for meal in response.data:
        meals_text += f"ID: {meal['id']} - {meal['meal_name']}: {meal['calories']} cal, {meal['protein']}g protein, {meal['carbs']}g carbs, {meal['fat']}g fat\n"
    
    return create_response(meals_text)


def create_response(message):
    """Create standardized response for Bedrock Agent"""
    return {
        'response': {
            'actionGroup': 'Action-Group',
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