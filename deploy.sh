#!/bin/bash
set -e
set -o pipefail

# Build Tools Lambda
echo "Building Tools Lambda..."
rm -rf ./lambda-functions/tools/build_lambda
mkdir -p ./lambda-functions/tools/build_lambda
cp ./lambda-functions/tools/meal_tools.py ./lambda-functions/tools/build_lambda/

# Build dependencies inside Amazon Linux 2 Docker
docker run --rm -v $(pwd):/var/task --platform linux/amd64 --entrypoint bash public.ecr.aws/lambda/python:3.11 -c "
    python3 -m pip install --upgrade pip && \
    python3 -m pip install --target /var/task/lambda-functions/tools/build_lambda -r /var/task/lambda-functions/tools/requirements.txt
"

cd ./lambda-functions/tools/build_lambda
zip -r ../tools_lambda.zip ./*
cd -

# Build Agent Lambda
echo "Building Agent Lambda..."
rm -rf ./lambda-functions/agent-lambda/build_lambda
mkdir -p ./lambda-functions/agent-lambda/build_lambda
cp ./lambda-functions/agent-lambda/agent.py ./lambda-functions/agent-lambda/build_lambda/

# Build dependencies inside Amazon Linux 2 Docker
docker run --rm -v $(pwd):/var/task --platform linux/amd64 --entrypoint bash public.ecr.aws/lambda/python:3.11 -c "
    python3 -m pip install --upgrade pip && \
    python3 -m pip install --target /var/task/lambda-functions/agent-lambda/build_lambda -r /var/task/lambda-functions/agent-lambda/requirements.txt
"

cd ./lambda-functions/agent-lambda/build_lambda
zip -r ../agent_lambda.zip ./*
cd -

# Deploy with Terraform
echo "Deploying with Terraform..."
cd ./terraform
terraform init
terraform apply -auto-approve

