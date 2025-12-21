terraform {
    required_version = ">= 1.5.0"

    required_providers {
        aws = {
        source  = "hashicorp/aws"
        version = "~> 5.0"
        }
    }
}

provider "aws" {
    region = "us-east-2"
}

#Variables
variable "bedrock_agent_id" {
    description = "Existing Bedrock Agent ID"
    type        = string
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
    function_name = "bedrock-agent-tools"
    runtime       = "python3.11"
    handler       = "handler.lambda_handler"
    role          = aws_iam_role.tools_lambda_role.arn

    filename         = "../lambda-functions/tools/tools_lambda.zip"
    source_code_hash = filebase64sha256("../lambda-functions/tools/tools_lambda.zip")

    timeout     = 30
    memory_size = 512
}

resource "aws_lambda_permission" "allow_bedrock" {
    statement_id  = "AllowBedrockInvoke"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.tools.function_name
    principal     = "bedrock.amazonaws.com"
}
