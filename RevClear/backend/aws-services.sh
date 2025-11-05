#!/bin/bash
# AWS Services Setup for RevClear Backend
# Run this script to set up all required AWS services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== RevClear AWS Services Setup ===${NC}\n"

# Configuration
PROJECT_NAME="revclear"
REGION="us-east-1"
ENVIRONMENT="production"

echo -e "${YELLOW}Project: ${PROJECT_NAME}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}\n"

# 1. Create RDS PostgreSQL Database
echo -e "${GREEN}[1/5] Creating RDS PostgreSQL Database...${NC}"
aws rds create-db-instance \
    --db-instance-identifier ${PROJECT_NAME}-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.3 \
    --master-username revclear_admin \
    --master-user-password "ChangeThisPassword123!" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --storage-encrypted \
    --publicly-accessible \
    --backup-retention-period 7 \
    --region ${REGION} \
    --tags Key=Project,Value=${PROJECT_NAME} Key=Environment,Value=${ENVIRONMENT}

echo -e "${GREEN}✓ RDS Database creation initiated${NC}\n"

# 2. Create S3 Bucket for file storage
echo -e "${GREEN}[2/5] Creating S3 Bucket...${NC}"
aws s3api create-bucket \
    --bucket ${PROJECT_NAME}-storage-${ENVIRONMENT} \
    --region ${REGION} \
    --create-bucket-configuration LocationConstraint=${REGION}

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket ${PROJECT_NAME}-storage-${ENVIRONMENT} \
    --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket ${PROJECT_NAME}-storage-${ENVIRONMENT} \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'

echo -e "${GREEN}✓ S3 Bucket created${NC}\n"

# 3. Create Cognito User Pool for authentication
echo -e "${GREEN}[3/5] Creating Cognito User Pool...${NC}"
USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name ${PROJECT_NAME}-users \
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
    --auto-verified-attributes email \
    --region ${REGION} \
    --query 'UserPool.Id' \
    --output text)

# Create User Pool Client
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id ${USER_POOL_ID} \
    --client-name ${PROJECT_NAME}-client \
    --no-generate-secret \
    --region ${REGION} \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo -e "${GREEN}✓ Cognito User Pool created${NC}"
echo -e "User Pool ID: ${USER_POOL_ID}"
echo -e "Client ID: ${CLIENT_ID}\n"

# 4. Create CloudWatch Log Group
echo -e "${GREEN}[4/5] Creating CloudWatch Log Group...${NC}"
aws logs create-log-group \
    --log-group-name /aws/revclear/${ENVIRONMENT} \
    --region ${REGION}

aws logs put-retention-policy \
    --log-group-name /aws/revclear/${ENVIRONMENT} \
    --retention-in-days 30 \
    --region ${REGION}

echo -e "${GREEN}✓ CloudWatch Log Group created${NC}\n"

# 5. Create Secrets Manager secret for database credentials
echo -e "${GREEN}[5/5] Creating Secrets Manager secret...${NC}"
aws secretsmanager create-secret \
    --name ${PROJECT_NAME}/database/credentials \
    --description "Database credentials for RevClear" \
    --secret-string '{
        "username": "revclear_admin",
        "password": "ChangeThisPassword123!",
        "engine": "postgres",
        "host": "PENDING",
        "port": 5432,
        "dbname": "revclear_db"
    }' \
    --region ${REGION}

echo -e "${GREEN}✓ Secrets Manager secret created${NC}\n"

echo -e "${BLUE}=== Setup Complete! ===${NC}\n"
echo -e "${YELLOW}Important: Save these values to your .env file:${NC}"
echo -e "AWS_REGION=${REGION}"
echo -e "AWS_USER_POOL_ID=${USER_POOL_ID}"
echo -e "AWS_CLIENT_ID=${CLIENT_ID}"
echo -e "AWS_S3_BUCKET=${PROJECT_NAME}-storage-${ENVIRONMENT}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Wait 5-10 minutes for RDS database to be ready"
echo -e "2. Run: aws rds describe-db-instances --db-instance-identifier ${PROJECT_NAME}-db --query 'DBInstances[0].Endpoint.Address'"
echo -e "3. Update the database host in Secrets Manager"
echo -e "4. Configure your backend with these credentials"
echo -e "5. Run the database schema setup script\n"
