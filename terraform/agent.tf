# Variables
variable "supabase_jwt_secret" {
  description = "Supabase JWT secret for local token verification"
  type        = string
  sensitive   = true
}

# IAM Role for Agent Lambda
resource "aws_iam_role" "agent_lambda_role" {
  name = "bedrock-agent-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# IAM Policy for Agent Lambda to invoke Bedrock Agent
resource "aws_iam_role_policy" "agent_lambda_bedrock_policy" {
  name = "agent-lambda-bedrock-policy"
  role = aws_iam_role.agent_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeAgent",
          "bedrock-agent-runtime:InvokeAgent"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Attach basic Lambda execution role for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "agent_lambda_logs" {
  role       = aws_iam_role.agent_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Function for Agent
resource "aws_lambda_function" "agent" {
  function_name = "cal-tracker-agent"
  runtime       = "python3.11"
  handler       = "agent.lambda_handler"
  role          = aws_iam_role.agent_lambda_role.arn

  filename         = "../lambda-functions/agent-lambda/agent_lambda.zip"
  source_code_hash = filebase64sha256("../lambda-functions/agent-lambda/agent_lambda.zip")

  timeout     = 300  # 5 minutes for Bedrock agent responses
  memory_size = 512

  environment {
    variables = {
      JWT_SECRET             = var.supabase_jwt_secret
      BEDROCK_AGENT_ID       = aws_bedrockagent_agent.CalTrackerAgent.id
      BEDROCK_AGENT_ALIAS_ID = "TSTALIASID"  # Default alias, update if using custom alias
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.agent_lambda_logs,
    aws_bedrockagent_agent.CalTrackerAgent
  ]
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "agent_api" {
  name        = "cal-tracker-agent-api"
  description = "API Gateway for Cal Tracker Bedrock Agent"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

}

# API Gateway Resource
resource "aws_api_gateway_resource" "agent_resource" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "agent"
}

# API Gateway Method (POST)
resource "aws_api_gateway_method" "agent_method" {
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = aws_api_gateway_resource.agent_resource.id
  http_method   = "POST"
  authorization = "NONE"  # Token verification happens in Lambda
}

# Enable CORS for OPTIONS method
resource "aws_api_gateway_method" "agent_options" {
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = aws_api_gateway_resource.agent_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "agent_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = aws_api_gateway_resource.agent_resource.id
  http_method = aws_api_gateway_method.agent_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "agent_options_200" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = aws_api_gateway_resource.agent_resource.id
  http_method = aws_api_gateway_method.agent_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "agent_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = aws_api_gateway_resource.agent_resource.id
  http_method = aws_api_gateway_method.agent_options.http_method
  status_code = aws_api_gateway_method_response.agent_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# API Gateway Integration with Lambda
resource "aws_api_gateway_integration" "agent_integration" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = aws_api_gateway_resource.agent_resource.id
  http_method = aws_api_gateway_method.agent_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.agent.invoke_arn

  request_parameters = {
    "integration.request.header.Content-Type" = "'application/json'"
  }
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.agent.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "agent_deployment" {
  depends_on = [
    aws_api_gateway_method.agent_method,
    aws_api_gateway_integration.agent_integration,
    aws_api_gateway_method.agent_options,
    aws_api_gateway_integration.agent_options_integration,
    aws_api_gateway_method_response.agent_options_200,
    aws_api_gateway_integration_response.agent_options_integration_response
  ]

  rest_api_id = aws_api_gateway_rest_api.agent_api.id

  # Use a hash of the API configuration to trigger redeployment on changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_method.agent_method.id,
      aws_api_gateway_integration.agent_integration.id,
      aws_api_gateway_method.agent_options.id,
      aws_api_gateway_integration.agent_options_integration.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "agent_stage" {
  deployment_id = aws_api_gateway_deployment.agent_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  stage_name    = "prod"
}

# Outputs
output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = "${aws_api_gateway_stage.agent_stage.invoke_url}/agent"
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.agent_api.id
}


