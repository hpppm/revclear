#!/bin/bash
# Quick Setup Script for RevClear Deployment
# Run this script to deploy to Google Cloud
# 
# Usage: ./deploy.sh [PROJECT_ID] [REGION] [ENVIRONMENT]
# Example: ./deploy.sh revclear-prod us-central1 prod

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration with defaults
# IMPORTANT: Change 'your-project-id' to your actual GCP project ID
PROJECT_ID="${1:-your-project-id}"  # Change this to your project ID
REGION="${2:-us-central1}"
ENVIRONMENT="${3:-prod}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 RevClear Deployment Script${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo "Configuration:"
echo "  Project ID:   ${PROJECT_ID}"
echo "  Region:       ${REGION}"
echo "  Environment:  ${ENVIRONMENT}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform not found. Please install: https://www.terraform.io/downloads${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Authenticate
echo -e "${YELLOW}Step 1: Authenticating to Google Cloud...${NC}"
gcloud auth login --no-launch-browser || echo -e "${YELLOW}⚠️  Using existing authentication${NC}"
gcloud auth application-default login --no-launch-browser || echo -e "${YELLOW}⚠️  Using existing application default credentials${NC}"
gcloud config set project "${PROJECT_ID}"

echo -e "${GREEN}✅ Authentication complete${NC}"
echo ""

# Create Terraform state bucket
echo -e "${YELLOW}Step 2: Creating Terraform state bucket...${NC}"
BUCKET_NAME="${PROJECT_ID}-terraform-state"
if gsutil mb -p "${PROJECT_ID}" -l "${REGION}" "gs://${BUCKET_NAME}" 2>/dev/null; then
    echo -e "${GREEN}✅ Bucket created: gs://${BUCKET_NAME}${NC}"
else
    echo -e "${YELLOW}ℹ️  Bucket already exists${NC}"
fi
gsutil versioning set on "gs://${BUCKET_NAME}"
echo ""

# Create terraform.tfvars
echo -e "${YELLOW}Step 3: Creating terraform configuration...${NC}"
cd terraform
cat > terraform.tfvars <<EOF
project_id   = "${PROJECT_ID}"
region       = "${REGION}"
environment  = "${ENVIRONMENT}"
domain_name  = "revclear.health"
EOF

echo -e "${GREEN}✅ Configuration created${NC}"
echo ""

# Initialize Terraform
echo -e "${YELLOW}Step 4: Initializing Terraform...${NC}"
if terraform init; then
    echo -e "${GREEN}✅ Terraform initialized${NC}"
else
    echo -e "${RED}❌ Terraform initialization failed${NC}"
    exit 1
fi
echo ""

# Plan deployment
echo -e "${YELLOW}Step 5: Planning infrastructure deployment...${NC}"
if terraform plan -out=tfplan; then
    echo -e "${GREEN}✅ Plan created successfully${NC}"
else
    echo -e "${RED}❌ Planning failed${NC}"
    exit 1
fi
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠️  Ready to deploy infrastructure to Google Cloud${NC}"
echo "This will create:"
echo "  - Cloud Run services"
echo "  - Cloud SQL database"
echo "  - Cloud Storage buckets"
echo "  - VPC network"
echo "  - BigQuery datasets"
echo "  - And more..."
echo ""
echo -e "${YELLOW}Estimated cost: \$50-100/month for dev, \$300-500/month for prod${NC}"
echo ""

read -p "Do you want to proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 0
fi

# Apply Terraform
echo ""
echo -e "${YELLOW}Step 6: Deploying infrastructure (this takes 10-15 minutes)...${NC}"
if terraform apply tfplan; then
    echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Save outputs
terraform output > ../terraform-outputs.txt
echo -e "${GREEN}✅ Outputs saved to terraform-outputs.txt${NC}"
echo ""

# Display next steps
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Build and deploy Docker containers:"
echo -e "   ${NC}cd ../backend"
echo -e "   gcloud builds submit --tag gcr.io/${PROJECT_ID}/revclear-api:latest${NC}"
echo ""
echo "2. Set up database schema:"
echo "   See database/schema.sql"
echo ""
echo "3. Configure Firebase authentication"
echo ""
echo "4. Get your frontend URL:"
FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "")
if [ -n "$FRONTEND_URL" ]; then
    echo -e "   ${GREEN}${FRONTEND_URL}${NC}"
fi
echo ""
echo -e "${CYAN}📖 Full documentation: DEPLOYMENT.md${NC}"
echo -e "${CYAN}💼 Business model: BUSINESS_MODEL.md${NC}"
echo ""
