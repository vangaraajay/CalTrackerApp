import os
import boto3
import json
from datetime import datetime, timezone
#from dotenv import load_dotenv
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, DecodeError, InvalidAudienceError

# Load environment variables
# load_dotenv()

# Get region from environment variable, default to us-east-2
# Note: In Lambda, AWS_REGION is automatically set by AWS
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-2')
bedrock_agent = boto3.client('bedrock-agent-runtime', region_name=AWS_REGION)


def verify_access_token(access_token: str) -> dict:
    """
    Verify Supabase JWT access token locally using JWT_SECRET.
    Returns dict with 'user_id' if valid, raises exception if invalid.
    Uses local JWT verification (no API call to Supabase) for better performance.
    Validates audience claim for security.
    """
    if not access_token:
        raise ValueError("Access token is required")
    
    jwt_secret = os.environ.get('JWT_SECRET')
    if not jwt_secret:
        raise ValueError("JWT_SECRET not configured")
    
    # Expected audience - Supabase access tokens use "authenticated"
    # Can be overridden via environment variable if needed
    expected_audience = os.environ.get('JWT_AUDIENCE', 'authenticated')
    
    try:
        # Verify and decode the JWT token
        # Supabase uses HS256 algorithm by default
        payload = jwt.decode(
            access_token,
            jwt_secret,
            algorithms=['HS256'],
            audience=expected_audience,  # Validate audience claim
            options={
                'verify_signature': True,
                'verify_exp': True,  # Verify expiration
                'verify_nbf': True,  # Verify not before
                'require': ['sub']   # Require 'sub' claim (user_id)
            }
        )
        
        # Extract user_id from 'sub' claim (Supabase stores user_id in 'sub')
        user_id = payload.get('sub')
        
        if not user_id:
            raise ValueError("User ID not found in token")
        
        return {
            'user_id': user_id,
            'payload': payload
        }
        
    except ExpiredSignatureError:
        print("Token has expired")
        raise ValueError("Token has expired") from None
    except InvalidAudienceError:
        print(f"Invalid audience - expected '{expected_audience}'")
        raise ValueError("Invalid token audience") from None
    except DecodeError as e:
        print(f"Token decode error: {str(e)}")
        raise ValueError("Invalid token format") from None
    except InvalidTokenError as e:
        print(f"Token validation failed: {str(e)}")
        raise ValueError("Invalid or expired access token") from None
    except Exception as e:
        print(f"Unexpected error during token verification: {str(e)}")
        raise ValueError("Invalid or expired access token") from None

def get_session_id(user_id: str, local_date: str) -> str:
    return f"{user_id}-{local_date}"

def lambda_handler(event, context):
    """
    Lambda handler for API Gateway or direct invocation.
    Verifies the access token, extracts user_id, and passes it securely to Bedrock Agent.
    """
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid JSON in request body'})
                }
        else:
            body = event.get('body', {})
        
        message = body.get('message', '')
        access_token = body.get('access_token')
        local_date = body.get('local_date')
        
        # Validate message length to prevent DoS attacks
        MAX_MESSAGE_LENGTH = 10000  # 10KB max message length
        if len(message) > MAX_MESSAGE_LENGTH:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Message too long (max {MAX_MESSAGE_LENGTH} characters)'})
            }
        
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
        
        # Generate deterministic session ID (same per user per day for conversation continuity)
        if not local_date:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'local_date is required'})
            }
        session_id = get_session_id(user_id, local_date)
        
        # Pass verified user_id via session attributes so it's available to tools
        # Since we've already verified the token, user_id is trusted at this point
        session_attributes = {
            'user_id': user_id
        }
        
        session_state = {
            'sessionAttributes': session_attributes
        }
        
        print(f"Invoking Bedrock Agent with session_id: {session_id}, user_id: {user_id}")
        print(f"Session state being passed: {json.dumps(session_state)}")
        
        response = bedrock_agent.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=session_id,
            inputText=message,
            sessionState=session_state
        )
        
        # Extract response from stream with error handling
        result = ""
        try:
            completion = response.get('completion', [])
            if not completion:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Empty response from agent'})
                }
            
            for event in completion:
                if 'chunk' in event:
                    chunk = event['chunk']
                    if 'bytes' in chunk:
                        try:
                            result += chunk['bytes'].decode('utf-8')
                        except UnicodeDecodeError as e:
                            print(f"Unicode decode error: {e}")
                            # Continue processing other chunks
                            continue
        except KeyError as e:
            print(f"Missing key in response: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid response format from agent'})
            }
        
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