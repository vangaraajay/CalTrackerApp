#!/bin/bash
set -e
set -o pipefail

cd ./terraform
terraform destroy -auto-approve
rm -rf .terraform
rm -f terraform.tfstate terraform.tfstate.backup .terraform.lock.hcl
cd -

# Delete the Lambda zip files
rm -f ./lambda-functions/tools/tools_lambda.zip
rm -f ./lambda-functions/agent-lambda/agent_lambda.zip

# Remove the build folders if they exist
rm -rf ./lambda-functions/tools/build_lambda
rm -rf ./lambda-functions/agent-lambda/build_lambda
