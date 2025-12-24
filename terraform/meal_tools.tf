terraform {
    required_version = ">= 1.5.0"

    required_providers {
        aws = {
        source  = "hashicorp/aws"
        version = "~> 5.30"
        }
    }
}

provider "aws" {
    region = "us-east-2"
}

# Variables for meal_tools Lambda environment
variable "db_api_url" {
    description = "Supabase database API URL"
    type        = string
    sensitive   = true
}

variable "db_api_key" {
    description = "Supabase service role key (for database operations)"
    type        = string
    sensitive   = true
}

resource "aws_iam_role" "tools_lambda_role" {
    name = "bedrock-tools-lambda-role"

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

resource "aws_iam_role_policy_attachment" "tools_lambda_logs" {
    role       = aws_iam_role.tools_lambda_role.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "tools" {
    function_name = "meal-tools"
    runtime       = "python3.11"
    handler       = "meal_tools.lambda_handler"
    role          = aws_iam_role.tools_lambda_role.arn

    filename         = "../lambda-functions/tools/tools_lambda.zip"
    source_code_hash = filebase64sha256("../lambda-functions/tools/tools_lambda.zip")

    timeout     = 60
    memory_size = 512

    environment {
        variables = {
            DB_API_URL = var.db_api_url
            DB_API_KEY = var.db_api_key
        }
    }
}

resource "aws_lambda_permission" "allow_bedrock" {
    statement_id  = "AllowBedrockInvoke"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.tools.function_name
    principal     = "bedrock.amazonaws.com"
}

resource "aws_iam_role" "bedrock_agent_role" {
    name = "bedrock-agent-role"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
        Effect = "Allow"
        Principal = {
            Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        }]
    })
}

resource "aws_iam_role_policy" "bedrock_agent_policy" {
    role = aws_iam_role.bedrock_agent_role.id

    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
        {
            Effect = "Allow"
            Action = [
            "bedrock:*",
            "lambda:InvokeFunction",
            "logs:*"
            ]
            Resource = "*"
        }
        ]
    })
}

resource "aws_bedrockagent_agent" "CalTrackerAgent" {
    agent_name = "multi-tool-agent"
    description = "Agent with multiple tools"

    foundation_model = "anthropic.claude-3-haiku-20240307-v1:0"

    instruction = <<EOF
You are a agent that helps people track their calories and macros. You will assist in lookup for calorie count, protein content, fat content, and carb content. You will also be able to add, edit, and remove meals from their daily meal tracker.
EOF

    agent_resource_role_arn = aws_iam_role.bedrock_agent_role.arn
}

resource "aws_bedrockagent_agent_action_group" "meals_tool" {
    agent_id      = aws_bedrockagent_agent.CalTrackerAgent.id
    agent_version = "DRAFT"

    action_group_name = "meal_tools"
    description       = "Manage meals using Supabase Lambda"

    action_group_executor {
        lambda = aws_lambda_function.tools.arn
    }

    api_schema {
        payload = file("${path.module}/agent-schemas/meal-tools-schema.yaml")
    }

    depends_on = [
        aws_lambda_function.tools,
        aws_lambda_permission.allow_bedrock
    ]

}

