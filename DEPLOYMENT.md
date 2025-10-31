# RevClear - Google Cloud Deployment Guide

This guide will help you deploy the RevClear AI Medical System to Google Cloud Platform.

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Terraform** installed: https://www.terraform.io/downloads
4. **Docker** installed: https://docs.docker.com/get-docker/
5. **Git** installed

## 🚀 Quick Start (15 minutes)

### Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login
gcloud auth application-default login

# Create a new project (or use existing)
export PROJECT_ID="revclear-prod"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export REGION="us-central1"

gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable billing (replace BILLING_ACCOUNT_ID)
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Step 2: Initialize Terraform State Bucket

```bash
# Create bucket for Terraform state
gsutil mb -p $PROJECT_ID -l $REGION gs://${PROJECT_ID}-terraform-state
gsutil versioning set on gs://${PROJECT_ID}-terraform-state

# Create terraform.tfvars file
cd terraform
cat > terraform.tfvars <<EOF
project_id   = "$PROJECT_ID"
region       = "$REGION"
environment  = "prod"
domain_name  = "revclear.health"
EOF
```

### Step 3: Deploy Infrastructure with Terraform

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy infrastructure (takes ~10-15 minutes)
terraform apply

# Save outputs
terraform output > ../terraform-outputs.txt
```

### Step 4: Build and Deploy Docker Containers

```bash
# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Build backend API
cd ../backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-api:latest

# Build frontend
cd ../Demo
gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-frontend:latest

# Update Cloud Run services
gcloud run services update revclear-api-prod \
  --image gcr.io/$PROJECT_ID/revclear-api:latest \
  --region $REGION

gcloud run services update revclear-frontend-prod \
  --image gcr.io/$PROJECT_ID/revclear-frontend:latest \
  --region $REGION
```

### Step 5: Set Up Database Schema

```bash
# Connect to Cloud SQL
gcloud sql connect revclear-db-prod --user=revclear-app

# Run schema migrations
psql -d claims -f ../database/schema.sql
```

### Step 6: Configure Firebase Authentication

```bash
# Enable Firebase
firebase init

# Enable authentication methods in Firebase Console:
# - Email/Password
# - Google Sign-In
# - SAML (for SSO)
```

### Step 7: Test the Deployment

```bash
# Get the frontend URL
FRONTEND_URL=$(terraform output -raw frontend_url)
echo "Frontend URL: $FRONTEND_URL"

# Open in browser
open $FRONTEND_URL
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet / Users                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Cloud Load     │
                  │  Balancer       │
                  └────────┬────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
    ┌────▼────┐                        ┌────▼────┐
    │ Cloud   │                        │ Cloud   │
    │ Run     │                        │ Run     │
    │Frontend │                        │ API     │
    └────┬────┘                        └────┬────┘
         │                                   │
         │          ┌────────────────────────┼────────────────┐
         │          │                        │                │
         │     ┌────▼────┐            ┌─────▼─────┐    ┌────▼────┐
         │     │ Cloud   │            │ Cloud SQL │    │ Cloud   │
         │     │ Storage │            │ Database  │    │ KMS     │
         │     └─────────┘            └───────────┘    └─────────┘
         │          │                        │                │
         │     ┌────▼────────────────────────▼────────────────▼────┐
         └────►│              Private VPC Network                  │
               │  (10.0.0.0/24)                                     │
               └────────────────────────────────────────────────────┘
                    │         │         │         │
              ┌─────▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────┐
              │Speech   │ │Vertex │ │ FHIR  │ │BigQuery│
              │-to-Text │ │  AI   │ │ Store │ │        │
              └─────────┘ └───────┘ └───────┘ └────────┘
```

## 💰 Cost Estimation

### Development Environment (~$50-100/month):
- Cloud Run (minimal): ~$5-10
- Cloud SQL (db-custom-2-8192): ~$20-30
- Cloud Storage (100GB): ~$2
- Speech-to-Text (~100 claims/month): ~$5
- Vertex AI (~100 predictions): ~$2
- BigQuery (1GB processed): ~$0.01
- Networking: ~$5-10
- Other services: ~$10-20

### Production Environment (~$300-500/month):
- Cloud Run (with traffic): ~$50-100
- Cloud SQL (db-custom-4-16384): ~$150-200
- Cloud Storage (1TB): ~$20
- Speech-to-Text (~1000 claims/month): ~$50
- Vertex AI (~1000 predictions): ~$20
- BigQuery (10GB processed): ~$0.05
- Load Balancer: ~$20-30
- Networking: ~$20-40
- Other services: ~$20-40

## 🔐 Security Configuration

### Enable Security Features:

```bash
# Enable VPC Service Controls
gcloud access-context-manager policies create \
  --title="RevClear Policy" \
  --scopes=projects/$PROJECT_NUMBER

# Enable Binary Authorization
gcloud services enable binaryauthorization.googleapis.com

# Set up Cloud Armor (DDoS protection)
gcloud compute security-policies create revclear-policy \
  --description="RevClear Security Policy"

# Enable Web Application Firewall rules
gcloud compute security-policies rules create 1000 \
  --security-policy=revclear-policy \
  --expression="evaluatePreconfiguredExpr('sqli-stable')" \
  --action=deny-403
```

### HIPAA Compliance Checklist:

- ✅ BAA signed with Google Cloud
- ✅ Encryption at rest (Cloud KMS)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access controls (IAM)
- ✅ Audit logging enabled
- ✅ Data retention policies (7 years)
- ✅ Backup and disaster recovery
- ✅ PHI data isolation
- ✅ Secure authentication (MFA)
- ✅ Regular security assessments

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Workflow:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Google Cloud

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Build and Push Docker Images
        run: |
          gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-api:$GITHUB_SHA
          gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-frontend:$GITHUB_SHA
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy revclear-api-prod \
            --image gcr.io/$PROJECT_ID/revclear-api:$GITHUB_SHA \
            --region us-central1
          
          gcloud run deploy revclear-frontend-prod \
            --image gcr.io/$PROJECT_ID/revclear-frontend:$GITHUB_SHA \
            --region us-central1
```

## 📊 Monitoring & Alerts

### Set up monitoring:

```bash
# Create monitoring workspace
gcloud alpha monitoring workspaces create \
  --project=$PROJECT_ID

# Create uptime check
gcloud monitoring uptime-checks create \
  --display-name="RevClear Frontend" \
  --resource-type=uptime-url \
  --monitored-resource-labels=host=$FRONTEND_URL

# Create alerting policy
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error Rate > 5%" \
  --condition-expression="resource.type=\"cloud_run_revision\" metric.type=\"run.googleapis.com/request_count\" metric.label.response_code_class=\"5xx\""
```

## 🎯 Post-Deployment Tasks

### 1. Configure Custom Domain:

```bash
# Map domain to Cloud Run
gcloud run domain-mappings create \
  --service=revclear-frontend-prod \
  --domain=revclear.health \
  --region=$REGION

# Update DNS records (in your domain registrar)
# Add the CNAME record shown in the output
```

### 2. Set Up Backups:

```bash
# Enable automated backups (already configured in Terraform)
# Test restore process
gcloud sql backups list --instance=revclear-db-prod
```

### 3. Load Test Data:

```bash
# Import sample data
gsutil cp sample-data.sql gs://$PROJECT_ID-backups/
gcloud sql import sql revclear-db-prod \
  gs://$PROJECT_ID-backups/sample-data.sql \
  --database=claims
```

### 4. Enable Monitoring Dashboard:

1. Go to Cloud Console → Monitoring
2. Create custom dashboard with:
   - API latency
   - Error rates
   - Claim processing time
   - Database connections
   - Storage usage

## 🐛 Troubleshooting

### Common Issues:

**Issue: Cloud Run service not accessible**
```bash
# Check IAM permissions
gcloud run services get-iam-policy revclear-api-prod --region=$REGION

# Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

**Issue: Database connection fails**
```bash
# Verify Cloud SQL proxy
gcloud sql connect revclear-db-prod --user=revclear-app

# Check VPC connector
gcloud compute networks vpc-access connectors describe revclear-connector-prod --region=$REGION
```

**Issue: Out of memory errors**
```bash
# Increase Cloud Run memory
gcloud run services update revclear-api-prod \
  --memory=4Gi \
  --region=$REGION
```

## 📞 Support

- Documentation: See README.md
- Issues: GitHub Issues
- GCP Support: https://cloud.google.com/support

## 🚀 Next Steps

1. **Set up monitoring alerts**
2. **Configure backup verification**
3. **Load test the system**
4. **Train ML models with real data**
5. **Integrate with actual clearinghouses**
6. **Get HIPAA audit/certification**

---

**Deployment Time**: ~30-45 minutes  
**Monthly Cost**: $50-500 depending on usage  
**Scaling**: Automatic with Cloud Run  
**Status**: Production-ready architecture
