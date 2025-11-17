#!/bin/bash
# Deployment script for Whisper Lambda function

set -e

echo "🚀 Deploying Whisper Lambda Function..."

# Configuration
FUNCTION_NAME="revclear-whisper-transcribe"
REGION="${AWS_REGION:-us-east-1}"
RUNTIME="python3.10"
HANDLER="lambda_handler.lambda_handler"
MEMORY_SIZE=4096
TIMEOUT=300
STORAGE_SIZE=2048

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"

# Clean previous builds
rm -rf deploy
mkdir -p deploy

# Copy lambda handler
cp lambda_handler.py deploy/

# Install dependencies
echo -e "${BLUE}📥 Installing Python dependencies...${NC}"
pip install -r requirements.txt -t deploy/ --platform manylinux2014_x86_64 --only-binary=:all:

# Create zip file
cd deploy
echo -e "${BLUE}🗜️  Creating zip archive...${NC}"
zip -r ../whisper-lambda.zip . -q
cd ..

echo -e "${GREEN}✅ Deployment package created: whisper-lambda.zip${NC}"

# Step 2: Check if function exists
echo -e "${BLUE}🔍 Checking if Lambda function exists...${NC}"

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo -e "${BLUE}📝 Updating existing Lambda function...${NC}"
    
    # Update function code
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://whisper-lambda.zip \
        --region "$REGION"
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --region "$REGION" \
        --environment "Variables={WHISPER_MODEL_SIZE=base}" \
        --ephemeral-storage "Size=$STORAGE_SIZE"
    
    echo -e "${GREEN}✅ Lambda function updated successfully!${NC}"
else
    echo -e "${BLUE}🆕 Creating new Lambda function...${NC}"
    
    # Create IAM role if needed (you should have this set up already)
    ROLE_ARN=$(aws iam get-role --role-name lambda-execution-role --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
        echo -e "${RED}❌ Lambda execution role not found. Please create it first.${NC}"
        echo "You can create it with:"
        echo "aws iam create-role --role-name lambda-execution-role --assume-role-policy-document file://trust-policy.json"
        exit 1
    fi
    
    # Create function
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "$ROLE_ARN" \
        --handler "$HANDLER" \
        --zip-file fileb://whisper-lambda.zip \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --region "$REGION" \
        --environment "Variables={WHISPER_MODEL_SIZE=base}" \
        --ephemeral-storage "Size=$STORAGE_SIZE"
    
    echo -e "${GREEN}✅ Lambda function created successfully!${NC}"
fi

# Step 3: Test function (optional)
echo -e "${BLUE}🧪 Testing Lambda function...${NC}"
echo "You can test with:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"bucket\":\"YOUR_BUCKET\",\"key\":\"YOUR_KEY\"}' response.json"

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}Function ARN:${NC}"
aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.FunctionArn' --output text

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"
# Uncomment if you want to clean up build artifacts
# rm -rf deploy whisper-lambda.zip

echo -e "${GREEN}✨ Done!${NC}"
