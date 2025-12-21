import os
import boto3
import json
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='us-east-2')

def queryAgent(message, agent_id, agent_alias_id='TSTALIASID'):
    """Query Bedrock Agent with tool support"""
    session_id = str(uuid.uuid4())
    
    response = bedrock_agent.invoke_agent(
        agentId=agent_id,
        agentAliasId=agent_alias_id,
        sessionId=session_id,
        inputText=message
    )
    
    # Extract response from stream
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
