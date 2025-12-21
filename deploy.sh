#!/bin/bash
set -e
set -o pipefail

rm -rf ./lambda-functions/tools/build_lambda
mkdir -p ./lambda-functions/tools/build_lambda
cp ./lambda-functions/tools/meal_tools.py ./lambda-functions/tools/build_lambda/

pip3 install --target ./lambda-functions/tools/build_lambda/ -r ./lambda-functions/tools/requirements.txt


cd ./lambda-functions/tools/build_lambda
zip -r ../tools_lambda.zip ./*
cd -

cd ./terraform
terraform init
terraform apply -auto-approve

