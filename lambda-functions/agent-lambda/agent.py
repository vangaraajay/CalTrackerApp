import os
import boto3
import json
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='us-east-2')


def verify_access_token(access_token: str) -> dict:
    """
    Verify Supabase JWT access token and extract user information.
    Returns dict with 'user_id' and 'user' if valid, raises exception if invalid.
    """
    if not access_token:
        raise ValueError("Access token is required")
    
    # Get Supabase URL and anon key from environment
    supabase_url = os.environ.get('DB_API_URL')
    supabase_anon_key = os.environ.get('DB_API_KEY')  # Anon key works for token verification
    
    if not supabase_url or not supabase_anon_key:
        raise ValueError("Supabase credentials not configured")
    
    # Create Supabase client
    supabase: Client = create_client(supabase_url, supabase_anon_key)
    
    # Verify the token by getting the user
    # This will raise an exception if the token is invalid
    try:
        user_response = supabase.auth.get_user(access_token)
        user = user_response.user
        
        if not user or not user.id:
            raise ValueError("Invalid user data from token")
        
        return {
            'user_id': user.id,
            'user': user
        }
    except Exception as e:
        # Log the error but don't expose details
        print(f"Token verification failed: {str(e)}")
        raise ValueError("Invalid or expired access token") from e


def lambda_handler(event, context):
    """
    Lambda handler for API Gateway or direct invocation.
    Verifies the access token, extracts user_id, and passes it securely to Bedrock Agent.
    """
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        message = body.get('message', '')
        access_token = body.get('access_token')
        
        if not access_token:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'access_token is required'})
            }
        
        # SECURITY: Verify the access token and extract user_id
        try:
            token_data = verify_access_token(access_token)
            user_id = token_data['user_id']
            print(f"Verified token for user_id: {user_id}")
        except Exception as e:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid or expired access token'})
            }
        
        agent_id = os.environ.get('BEDROCK_AGENT_ID')
        agent_alias_id = os.environ.get('BEDROCK_AGENT_ALIAS_ID', 'TSTALIASID')
        
        if not agent_id:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Agent ID not configured'})
            }
        
        # Use user_id as part of session ID for consistency
        # This ensures each user gets their own session context
        session_id = f"{user_id}-{str(uuid.uuid4())}"
        
        # Pass verified user_id via session attributes so it's available to tools
        # Since we've already verified the token, user_id is trusted at this point
        session_attributes = {
            'user_id': user_id
        }
        
        response = bedrock_agent.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=message,
            sessionState={
                'sessionAttributes': session_attributes
            }
        )
        
        # Extract response from stream
        result = ""
        for event in response['completion']:
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    result += chunk['bytes'].decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'response': result})
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }


def queryAgent(message, agent_id, agent_alias_id='TSTALIASID', access_token=None, user_id=None):
    """
    Query Bedrock Agent with tool support (for backward compatibility or direct calls).
    If access_token is provided, it will be verified. If user_id is provided directly,
    it will be used (useful for testing, but less secure).
    """
    session_id = str(uuid.uuid4())
    session_attributes = {}
    
    # If access_token provided, verify it
    if access_token:
        try:
            token_data = verify_access_token(access_token)
            session_attributes['user_id'] = token_data['user_id']
        except Exception as e:
            raise ValueError(f"Token verification failed: {str(e)}") from e
    elif user_id:
        # For testing/backward compatibility - less secure
        session_attributes['user_id'] = user_id
        print("WARNING: Using user_id directly without token verification")
    
    response = bedrock_agent.invoke_agent(
        agentId=agent_id,
        agentAliasId=agent_alias_id,
        sessionId=session_id,
        inputText=message,
        sessionState={
            'sessionAttributes': session_attributes
        } if session_attributes else None
    )
    
    result = ""
    for event in response['completion']:
        if 'chunk' in event:
            chunk = event['chunk']
            if 'bytes' in chunk:
                result += chunk['bytes'].decode('utf-8')
    
    return result

if __name__ == "__main__":
    agent_id = os.environ.get('BEDROCK_AGENT_ID')
    print(queryAgent("Answer 1 + 1", agent_id))
