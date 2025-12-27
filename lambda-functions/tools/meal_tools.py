import json
import os
from supabase import create_client
import traceback
import re
import difflib
from types import SimpleNamespace
'''
Only needed if running locally
from dotenv import load_dotenv

load_dotenv()
'''

# Initialize Supabase client
supabase = create_client(
    os.environ.get('DB_API_URL'),
    os.environ.get('DB_API_KEY')
)

def lambda_handler(event, context):
    """Main Lambda handler for Bedrock Agent tools"""
    print(f'Event: {json.dumps(event, indent=2)}')

    # SECURITY: Extract user_id from session attributes (passed by Agent Lambda after token verification)
    session_attributes = event.get('sessionAttributes', {})
    user_id = session_attributes.get('user_id') if isinstance(session_attributes, dict) else None
    
    if not user_id:
        api_path = event.get("apiPath") or ""
        action_group = event.get("actionGroup", "")
        http_method = event.get("httpMethod", "POST")
        return create_response(
            "Error: user_id not found in session. Authentication required.",
            api_path,
            action_group,
            http_method,
            status_code=401
        )

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
    print(f"Normalized parameters: {parameters}, user_id: {user_id}")

    try:
        # Determine which tool to call based on apiPath - pass user_id for security
        if api_path == "/findMealByName":
            message = find_meal_by_name(parameters, user_id)
        elif api_path == "/addMeal":
            message = add_meal(parameters, user_id)
        elif api_path == "/deleteMeal":
            message = delete_meal(parameters, user_id)
        elif api_path == "/modifyMeal":
            message = modify_meal(parameters, user_id)
        elif api_path == "/getMeals":
            message = get_meals(parameters, user_id)
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


def add_meal(params, user_id):
    # Validate required parameters
    missing = []
    if not params.get("meal_name"):
        missing.append("meal_name")
    if params.get("calories") is None:
        missing.append("calories")
    if missing:
        return f"Missing required parameters: {', '.join(missing)}"

    try:
        # SECURITY: Always include user_id to ensure meals are associated with the authenticated user
        payload = {
            "meal_name": params.get("meal_name"),
            "calories": params.get("calories"),
            "protein": params.get("protein"),
            "carbs": params.get("carbs"),
            "fat": params.get("fat"),
            "user_id": user_id
        }
        response = supabase.table("Meals").insert(payload).execute()
        err = getattr(response, "error", None)
        if err:
            return f"DB error adding meal: {err}"
        return f"Added {params.get('meal_name')} with {params.get('calories')} calories"
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
    # try stripping common unit suffixes like 'g', 'cal', 'kcal'
    s = re.sub(r"(?i)\b([0-9,.]+)\s*(k?cal|cal|g)\b", r"\1", s)
    s = s.replace(',', '')
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
    s2 = s.strip()
    # try JSON first
    try:
        if (s2.startswith('{') and s2.endswith('}')) or (s2.startswith('[') and s2.endswith(']')):
            parsed = json.loads(s2)
            if isinstance(parsed, dict):
                # convert values
                return {k: _try_convert_value(v) for k, v in parsed.items()}
    except Exception:
        pass

    # simple XML-like tags: <name>Chipotle Burrito</name><calories>50</calories>
    if '<' in s2 and '</' in s2:
        # find tags of form <key>value</key>
        for m in re.finditer(r"<([a-zA-Z0-9_\-]+)>(.*?)</\1>", s2, flags=re.DOTALL):
            key = m.group(1).strip()
            val = m.group(2).strip()
            out[key] = _try_convert_value(val)
        if out:
            return out

    # fallback: remove surrounding braces if present
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


def delete_meal(params, user_id):
    meal_id = params.get("meal_id")
    if meal_id is None:
        return "Missing required parameter: meal_id"
    try:
        # SECURITY: Filter by user_id to ensure users can only delete their own meals
        response = supabase.table("Meals").delete()\
            .eq("id", meal_id)\
            .eq("user_id", user_id)\
            .execute()
        err = getattr(response, "error", None)
        if err:
            return f"DB error deleting meal: {err}"
        # Check if any rows were deleted
        data = getattr(response, "data", None)
        if not data:
            return f"Meal with ID {meal_id} not found or you don't have permission to delete it"
        return f"Deleted meal with ID {meal_id}"
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return f"Exception deleting meal: {str(e)}"


def modify_meal(params, user_id):
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
        # SECURITY: Filter by user_id to ensure users can only modify their own meals
        response = supabase.table("Meals").update(update_data)\
            .eq("id", meal_id)\
            .eq("user_id", user_id)\
            .execute()
        err = getattr(response, "error", None)
        if err:
            return f"DB error modifying meal: {err}"
        # Check if any rows were updated
        data = getattr(response, "data", None)
        if not data:
            return f"Meal with ID {meal_id} not found or you don't have permission to modify it"
        return f"Modified meal with ID {meal_id}"
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return f"Exception modifying meal: {str(e)}"


def get_meals(params, user_id):

    try:
        # SECURITY: Filter by user_id to only get the authenticated user's meals
        response = supabase.table("Meals")\
            .select("id, meal_name, calories, protein, carbs, fat, created_at")\
            .eq("user_id", user_id)\
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
        text += f"{meal['meal_name']}: {meal['calories']} cal, {meal['protein']}g protein, {meal['carbs']}g carbs, {meal['fat']}g fat\n"
    return text


def _normalize_text(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[\W_]+", " ", s)  # remove punctuation
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _token_jaccard(a: str, b: str) -> float:
    ta = set(a.split())
    tb = set(b.split())
    if not ta and not tb:
        return 0.0
    inter = ta.intersection(tb)
    union = ta.union(tb)
    return len(inter) / len(union) if union else 0.0

def find_meal_by_name(params, user_id):
    """Find today's meals that best match `params['name']`.

    Returns structured candidates with scores. If `action` and `auto_confirm_threshold`
    are provided and best match meets threshold, performs the action.
    """
    name = params.get("name")
    if not name:
        return {"candidates": [], "best_match": None, "auto_act_performed": False, "message": "Missing 'name' parameter"}

    action = params.get("action")  # 'modify'|'delete'|None
    threshold = float(params.get("auto_confirm_threshold", 0.85))
    update_fields = params.get("update_fields") or {}

    try:
        # SECURITY: Filter by user_id to only search the authenticated user's meals
        response = supabase.table("Meals")\
            .select("id, meal_name, calories, protein, carbs, fat, created_at")\
            .eq("user_id", user_id)\
            .execute()
        rows = getattr(response, "data", []) or []
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        return {"candidates": [], "best_match": None, "auto_act_performed": False, "message": f"DB error: {str(e)}"}

    if not rows:
        return {"candidates": [], "best_match": None, "auto_act_performed": False, "message": "No meals found today"}

    target = _normalize_text(name)
    candidates = []

    for r in rows:
        mname = r.get("meal_name") or ""
        norm = _normalize_text(mname)

        seq_ratio = difflib.SequenceMatcher(None, target, norm).ratio()
        jacc = _token_jaccard(target, norm)
        score = max(seq_ratio, jacc)

        # bonus if calories specified and matches
        try:
            provided_cal = params.get("calories")
            if provided_cal is not None and r.get("calories") is not None:
                if int(r.get("calories")) == int(provided_cal):
                    score = min(1.0, score + 0.1)
        except Exception:
            pass

        candidates.append({
            "id": r.get("id"),
            "name": mname,
            "calories": r.get("calories"),
            "created_at": r.get("created_at"),
            "score": round(float(score), 3)
        })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    best_candidate = candidates[0] if candidates else None
    best_score = float(best_candidate.get("score", 0.0)) if best_candidate else 0.0

    # Auto-act if requested
    if action and best_candidate and best_score >= threshold:
        if action == "delete":
            msg = delete_meal({"meal_id": best_candidate.get("id")}, user_id)
            return {"candidates": candidates[:5], "best_match": best_candidate, "auto_act_performed": True, "message": msg}
        elif action == "modify":
            params_for_modify = {"meal_id": best_candidate.get("id")}
            params_for_modify.update(update_fields or {})
            msg = modify_meal(params_for_modify, user_id)
            return {"candidates": candidates[:5], "best_match": best_candidate, "auto_act_performed": True, "message": msg}

    # Return top candidates for agent clarification
    return {"candidates": candidates[:5], "best_match": best_candidate, "auto_act_performed": False, "message": "Candidates returned"}


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