import json
import os
from datetime import datetime, timezone
from supabase import create_client
import traceback

# Initialize Supabase client
supabase = create_client(
    os.environ.get('DB_API_URL'),
    os.environ.get('DB_API_KEY')
)

def lambda_handler(event, context):
    """Main Lambda handler for Bedrock Agent tools"""
    print(f'Event: {json.dumps(event, indent=2)}')

    # normalize event keys: Bedrock agent variations may use different keys
    api_path = event.get("apiPath") or event.get("path")
    # older/local tests may send 'function' names like 'add_meal'
    func_name = event.get("function") or event.get("operationId")
    if not api_path and func_name:
        mapping = {
            "add_meal": "/addMeal",
            "delete_meal": "/deleteMeal",
            "modify_meal": "/modifyMeal",
            "get_meals": "/getMeals",
            "get_meal": "/getMeals",
        }
        api_path = mapping.get(func_name, func_name)

    action_group = event.get("actionGroup")
    http_method = event.get("httpMethod", "POST")
    # Normalize parameters coming from various Bedrock agent shapes
    parameters = normalize_parameters(event)
    print(f"Normalized parameters: {parameters}")

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
        # Always return the proper structure, even on error. Include traceback for easier debugging.
        tb = traceback.format_exc()
        print(tb)
        return create_response(f"Error: {str(e)}\n{tb}", api_path, action_group, http_method, status_code=500)


def add_meal(params):
    # Validate required parameters
    missing = []
    if not params.get("name"):
        missing.append("name")
    if params.get("calories") is None:
        missing.append("calories")
    if missing:
        return f"Missing required parameters: {', '.join(missing)}"

    try:
        payload = {
            "meal_name": params.get("name"),
            "calories": params.get("calories"),
            "protein": params.get("protein"),
            "carbs": params.get("carbs"),
            "fat": params.get("fat")
        }
        response = supabase.table("Meals").insert(payload).execute()
        err = getattr(response, "error", None)
        if err:
            return f"DB error adding meal: {err}"
        return f"Added {params.get('name')} with {params.get('calories')} calories"
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return f"Exception adding meal: {str(e)}"


def _try_convert_value(v: str):
    """Try to convert numeric-looking strings to int/float, otherwise return stripped str."""
    if isinstance(v, (int, float)):
        return v
    s = str(v).strip()
    # remove surrounding braces
    if s.startswith("{") and s.endswith("}"):
        s = s[1:-1].strip()
    # numeric int
    if s.isdigit() or (s.startswith("-") and s[1:].isdigit()):
        try:
            return int(s)
        except Exception:
            pass
    # numeric float
    try:
        f = float(s)
        return f
    except Exception:
        pass
    return s


def _parse_key_values(s: str):
    """Parse strings like "{carbs=30, protein=40, name=burrito}" into a dict."""
    out = {}
    if not s:
        return out
    # remove surrounding braces if present
    s2 = s.strip()
    if s2.startswith("{") and s2.endswith("}"):
        s2 = s2[1:-1]
    # split by commas
    parts = [p.strip() for p in s2.split(",") if p.strip()]
    for part in parts:
        if "=" in part:
            k, v = part.split("=", 1)
        elif ":" in part:
            k, v = part.split(":", 1)
        else:
            # can't parse, continue
            continue
        key = k.strip()
        val = _try_convert_value(v.strip())
        out[key] = val
    return out


def normalize_parameters(event: dict):
    """Return a dict of parameters for use by tool functions.

    Handles several incoming shapes seen from Bedrock agents:
    - `parameters` as a dict
    - `parameters` as a list containing a dict with 'value' string
    - `requestBody.content.application/json.properties` array with a 'value' string
    - raw inputText (best-effort parsing)
    """
    # 1. Direct dict
    params = event.get("parameters")
    if isinstance(params, dict):
        return params

    # 2. parameters sent as a list (observed shape)
    if isinstance(params, list) and len(params) > 0:
        first = params[0]
        # If first is a dict with 'value' field containing a key=value string
        if isinstance(first, dict):
            # Attempt to read 'value' or 'properties' style
            if "value" in first and isinstance(first["value"], str):
                parsed = _parse_key_values(first["value"])
                if parsed:
                    return parsed
            # some agents put nested properties
            if "properties" in first and isinstance(first["properties"], list):
                # look for an entry with name 'parameters' or similar
                for p in first["properties"]:
                    if isinstance(p, dict) and p.get("name") == "parameters" and isinstance(p.get("value"), str):
                        parsed = _parse_key_values(p.get("value"))
                        if parsed:
                            return parsed
    # 3. requestBody content
    rb = event.get("requestBody") or {}
    if isinstance(rb, dict):
        content = rb.get("content") or {}
        appjson = content.get("application/json") or {}
        # some schemas put properties as a list
        props = appjson.get("properties")
        if isinstance(props, list):
            for p in props:
                if isinstance(p, dict) and p.get("name") == "parameters":
                    val = p.get("value")
                    if isinstance(val, str):
                        parsed = _parse_key_values(val)
                        if parsed:
                            return parsed
        # sometimes the body includes a 'parameters' key directly
        if isinstance(appjson, dict) and isinstance(appjson.get("parameters"), dict):
            return appjson.get("parameters")

    # 4. fallback: try to parse `inputText` for a simple list of key numbers
    input_text = event.get("inputText") or ""
    if input_text:
        # look for patterns like "name: burrito, calories: 500"
        parsed = _parse_key_values(input_text)
        if parsed:
            return parsed

    # final fallback: return empty dict
    return {}


def delete_meal(params):
    meal_id = params.get("meal_id")
    if meal_id is None:
        return "Missing required parameter: meal_id"
    try:
        response = supabase.table("Meals").delete().eq("id", meal_id).execute()
        err = getattr(response, "error", None)
        if err:
            return f"DB error deleting meal: {err}"
        return f"Deleted meal with ID {meal_id}"
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return f"Exception deleting meal: {str(e)}"


def modify_meal(params):
    meal_id = params.get("meal_id")
    if meal_id is None:
        return "Missing required parameter: meal_id"
    update_data = {}
    if params.get("name") is not None:
        update_data["meal_name"] = params.get("name")
    if params.get("calories") is not None:
        update_data["calories"] = params.get("calories")
    if params.get("protein") is not None:
        update_data["protein"] = params.get("protein")
    if params.get("carbs") is not None:
        update_data["carbs"] = params.get("carbs")
    if params.get("fat") is not None:
        update_data["fat"] = params.get("fat")
    if not update_data:
        return "No fields provided to update"
    try:
        response = supabase.table("Meals").update(update_data).eq("id", meal_id).execute()
        err = getattr(response, "error", None)
        if err:
            return f"DB error modifying meal: {err}"
        return f"Modified meal with ID {meal_id}"
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return f"Exception modifying meal: {str(e)}"


def get_meals(params):
    today_utc = datetime.now(timezone.utc)
    start_of_day = today_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = today_utc.replace(hour=23, minute=59, second=59, microsecond=999999)

    try:
        response = supabase.table("Meals")\
            .select("id, meal_name, calories, protein, carbs, fat, created_at")\
            .gte("created_at", start_of_day.isoformat())\
            .lte("created_at", end_of_day.isoformat())\
            .execute()

        data = getattr(response, "data", None)
        if not data:
            return "No meals found for today"
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return f"Exception retrieving meals: {str(e)}"

    text = "Today's meals:\n"
    for meal in data:
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