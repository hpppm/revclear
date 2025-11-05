#!/bin/bash
# Deploy RevClear Backend to AWS

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== RevClear AWS Deployment ===${NC}\n"

# Configuration
PROJECT_NAME="revclear"
REGION="us-east-1"
ECR_REPO="${PROJECT_NAME}-backend"

echo -e "${GREEN}[1/5] Building Docker image...${NC}"
docker build -t ${PROJECT_NAME}-backend:latest .

echo -e "${GREEN}[2/5] Creating ECR repository (if not exists)...${NC}"
aws ecr create-repository \
    --repository-name ${ECR_REPO} \
    --region ${REGION} \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null || echo "Repository already exists"

echo -e "${GREEN}[3/5] Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${REGION}.amazonaws.com

echo -e "${GREEN}[4/5] Tagging and pushing image...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}"

docker tag ${PROJECT_NAME}-backend:latest ${ECR_URI}:latest
docker tag ${PROJECT_NAME}-backend:latest ${ECR_URI}:$(date +%Y%m%d-%H%M%S)
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}[5/5] Deploying to ECS (if configured)...${NC}"
# Update ECS service to use new image
aws ecs update-service \
    --cluster ${PROJECT_NAME}-cluster \
    --service ${PROJECT_NAME}-backend-service \
    --force-new-deployment \
    --region ${REGION} \
    2>/dev/null || echo "ECS service not configured yet"

echo -e "\n${BLUE}=== Deployment Complete! ===${NC}\n"
echo -e "${YELLOW}Image pushed to: ${ECR_URI}:latest${NC}\n"
