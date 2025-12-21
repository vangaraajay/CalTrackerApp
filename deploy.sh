#!/bin/bash
set -e
set -o pipefail

rm -rf ./lambda-functions/tools/build_lambda
mkdir -p ./lambda-functions/tools/build_lambda
cp ./lambda-functions/tools/meal_tools.py ./lambda-functions/tools/build_lambda/

# Build dependencies inside Amazon Linux 2 Docker
docker run --rm -v $(pwd):/var/task --platform linux/amd64 --entrypoint bash public.ecr.aws/lambda/python:3.11 -c "
    python3 -m pip install --upgrade pip && \
    python3 -m pip install --target /var/task/lambda-functions/tools/build_lambda -r /var/task/lambda-functions/tools/requirements.txt
"
#docker run --rm -v $(pwd):/var/task public.ecr.aws/lambda/python:3.11 bash -c "
#    yum install -y python3 python3-devel python3-pip zip gcc && \
#    pip3 install --target /var/task/lambda-functions/tools/build_lambda -r /var/task/lambda-functions/tools/requirements.txt
#"


cd ./lambda-functions/tools/build_lambda
zip -r ../tools_lambda.zip ./*
cd -

cd ./terraform
terraform init
terraform apply -auto-approve

