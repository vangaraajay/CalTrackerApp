#!/bin/bash
set -e
set -o pipefail

cd ./terraform
terraform init
terraform destroy -auto-approve
cd -

# Delete the Lambda zip
rm -f ./lambda-functions/tools/tools_lambda.zip

# Optionally, remove the build folder if it exists
rm -rf ./lambda-functions/tools/build_lambda
