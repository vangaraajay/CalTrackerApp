import boto3
import json

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def queryAgent(message):
    """Query Claude 3 Haiku via Bedrock"""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 150,
        "messages": [
            {
                "role": "user",
                "content": message
            }
        ]
    })
    
    response = bedrock.invoke_model(
        body=body,
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        accept='application/json',
        contentType='application/json'
    )
    
    response_body = json.loads(response.get('body').read())
    return response_body['content'][0]['text']

if __name__ == "__main__":
    print(queryAgent("Answer 1 + 1"))
