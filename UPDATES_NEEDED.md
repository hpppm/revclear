# Files and Updates Needed

**Last Updated**: November 8, 2025  
**Based on**: Current AWS infrastructure (DynamoDB, S3, KMS, CloudTrail, Amplify)

## 📋 Priority: HIGH (Required for Functionality)

### 1. Main README.md
**File**: `README.md`  
**Status**: ⚠️ **NEEDS UPDATE**

**Changes Required**:
```diff
- Database: PostgreSQL → DynamoDB
- Backend: FastAPI/Python → Node.js/Express  
- Add reference to DEPLOYMENT_STATUS.md
- Update environment variables section
- Update AWS services list (remove RDS, add DynamoDB)
- Update deployment instructions for current setup
- Add Terraform deployment section
```

**Current Issues**:
- ❌ References PostgreSQL/RDS (you have DynamoDB)
- ❌ References FastAPI/Python (need to verify your actual stack)
- ❌ Missing DynamoDB table names
- ❌ Missing KMS key reference
- ❌ Missing link to deployment status

**Action**: Update with current tech stack

---

### 2. Backend Environment Configuration
**File**: `RevClear/backend/.env.example` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Create This File**:
```env
# =========================================
# RevClear Backend Environment Variables
# =========================================

# Environment
NODE_ENV=development
PORT=8080
API_VERSION=v1

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# DynamoDB Tables (YOUR EXISTING TABLES)
DYNAMODB_TABLE_PHYSICAL_THERAPY=physical_therapy_patients
DYNAMODB_TABLE_SPEECH_THERAPY=speech_therapy_patients
DYNAMODB_TABLE_MENTAL_HEALTH=mental_health_patients

# S3 Buckets (YOUR EXISTING BUCKETS)
S3_BUCKET_MAIN=arevclear
S3_BUCKET_RAW=arevclear-raw
S3_BUCKET_EXPORTS=arevclear-exports
S3_BUCKET_LOGS=arevclear-logs

# KMS Encryption (YOUR EXISTING KEY)
KMS_KEY_ID=4ed14exxxxxxxx10-78de-4dxxbe-97xxx-xxxxxxxxxxx
KMS_KEY_ALIAS=alias/revclear-hipaa-key

# CloudTrail
CLOUDTRAIL_NAME=RevClearTrail

# IAM
IAM_ROLE_AMPLIFY=AmplifyServiceRole

# Authentication (TO BE CREATED)
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_REGION=us-east-1

# API Gateway (TO BE CREATED)
API_GATEWAY_URL=

# Amplify (CURRENT - TEMPORARY)
AMPLIFY_APP_ID=app2100
AMPLIFY_DOMAIN=d1hbslcew3u3eg.amplifyapp.com

# Logging
LOG_LEVEL=info
CLOUDWATCH_LOG_GROUP=/aws/revclear/backend

# HIPAA Compliance
ENABLE_PHI_LOGGING=false  # Never log PHI!
ENABLE_AUDIT_LOGGING=true

# Feature Flags
ENABLE_AI_TRANSCRIPTION=false  # Future: Amazon Transcribe
ENABLE_AI_CODING=false         # Future: Amazon Bedrock
ENABLE_EDI_GENERATION=true
```

**Action**: Create this file to document environment configuration

---

### 3. Frontend Environment Configuration
**File**: `RevClear/frontend/.env.example` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Create This File**:
```env
# =========================================
# RevClear Frontend Environment Variables
# =========================================

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1

# Cognito (TO BE CONFIGURED)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_REGION=us-east-1

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=false
NEXT_PUBLIC_ENABLE_AUDIO_UPLOAD=false
NEXT_PUBLIC_ENABLE_EDI_EXPORT=true

# Environment
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_APP_VERSION=1.0.0

# Amplify (CURRENT DEPLOYMENT)
NEXT_PUBLIC_AMPLIFY_URL=https://d1hbslcew3u3eg.amplifyapp.com
```

**Action**: Create this file for frontend configuration

---

### 4. Backend AWS Configuration Module
**File**: `RevClear/backend/src/config/aws.ts` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Create This File**:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { KMSClient } from '@aws-sdk/client-kms';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// AWS SDK Configuration
const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

// DynamoDB Client
export const dynamoDBClient = new DynamoDBClient(AWS_CONFIG);
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// S3 Client
export const s3Client = new S3Client(AWS_CONFIG);

// KMS Client
export const kmsClient = new KMSClient(AWS_CONFIG);

// Table Names (Your Existing Tables)
export const TABLES = {
  PHYSICAL_THERAPY: process.env.DYNAMODB_TABLE_PHYSICAL_THERAPY || 'physical_therapy_patients',
  SPEECH_THERAPY: process.env.DYNAMODB_TABLE_SPEECH_THERAPY || 'speech_therapy_patients',
  MENTAL_HEALTH: process.env.DYNAMODB_TABLE_MENTAL_HEALTH || 'mental_health_patients',
};

// S3 Bucket Names (Your Existing Buckets)
export const BUCKETS = {
  MAIN: process.env.S3_BUCKET_MAIN || 'arevclear',
  RAW: process.env.S3_BUCKET_RAW || 'arevclear-raw',
  EXPORTS: process.env.S3_BUCKET_EXPORTS || 'arevclear-exports',
  LOGS: process.env.S3_BUCKET_LOGS || 'arevclear-logs',
};

// KMS Key ID (Your Existing Key)
export const KMS_KEY_ID = process.env.KMS_KEY_ID || '';

// Export configuration
export const awsConfig = {
  region: AWS_CONFIG.region,
  tables: TABLES,
  buckets: BUCKETS,
  kmsKeyId: KMS_KEY_ID,
};
```

**Action**: Create this module to centralize AWS SDK configuration

---

## 📋 Priority: MEDIUM (Documentation & Configuration)

### 5. Terraform Variables for Existing Resources
**File**: `terraform/environments/dev/terraform.tfvars` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Create This File**:
```hcl
# RevClear Development Environment
# Based on existing AWS infrastructure

# General
environment  = "dev"
aws_region   = "us-east-1"
project_name = "revclear"

# Existing KMS Key (IMPORT THIS)
# kms_key_id = "4ed14exxxxxxxx10-78de-4dxxbe-97xxx-xxxxxxxxxxx"

# Existing DynamoDB Tables (IMPORT THESE)
# These tables already exist and should be imported into Terraform state
dynamodb_tables = [
  "physical_therapy_patients",
  "speech_therapy_patients",
  "mental_health_patients"
]

# Existing S3 Buckets (IMPORT THESE)
existing_s3_buckets = [
  "arevclear",
  "arevclear-raw",
  "arevclear-exports",
  "arevclear-logs"
]

# Network Configuration (NEW)
vpc_cidr                = "10.0.0.0/16"
availability_zones      = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs    = ["10.0.11.0/24", "10.0.12.0/24"]

# Compute (NEW - For API Gateway + Lambda)
fargate_cpu      = 256   # Not used yet
fargate_memory   = 512   # Not used yet
app_count        = 1

# Security (NEW - To Be Created)
enable_waf                   = false
cognito_mfa_configuration    = "OPTIONAL"
cloudwatch_log_retention_days = 2555  # 7 years HIPAA

# Tags
additional_tags = {
  Environment = "development"
  ManagedBy   = "terraform"
  HIPAA       = "true"
  Team        = "RevClear"
}
```

**Action**: Create this file and import existing resources

---

### 6. Import Script for Existing AWS Resources
**File**: `terraform/import-existing.sh` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Create This File**:
```bash
#!/bin/bash
# Import existing AWS resources into Terraform state

set -e

echo "🔄 Importing existing AWS resources into Terraform..."

# Import KMS Key
echo "📦 Importing KMS Key..."
terraform import aws_kms_key.main 4ed14exxxxxxxx10-78de-4dxxbe-97xxx-xxxxxxxxxxx

# Import DynamoDB Tables
echo "📦 Importing DynamoDB tables..."
terraform import aws_dynamodb_table.physical_therapy physical_therapy_patients
terraform import aws_dynamodb_table.speech_therapy speech_therapy_patients
terraform import aws_dynamodb_table.mental_health mental_health_patients

# Import S3 Buckets
echo "📦 Importing S3 buckets..."
terraform import aws_s3_bucket.main arevclear
terraform import aws_s3_bucket.raw arevclear-raw
terraform import aws_s3_bucket.exports arevclear-exports
terraform import aws_s3_bucket.logs arevclear-logs

# Import CloudTrail
echo "📦 Importing CloudTrail..."
terraform import aws_cloudtrail.main RevClearTrail

# Import IAM Role
echo "📦 Importing IAM role..."
terraform import aws_iam_role.amplify AmplifyServiceRole

echo "✅ Import complete! Run 'terraform plan' to verify."
```

**Action**: Create this script to import existing resources

---

### 7. GitHub Actions Workflow Update
**File**: `.github/workflows/aws-deploy.yml`  
**Status**: ⚠️ **NEEDS UPDATE**

**Changes Required**:
```yaml
# Add steps for DynamoDB operations
- name: Test DynamoDB Connection
  run: |
    aws dynamodb describe-table --table-name physical_therapy_patients
    aws dynamodb describe-table --table-name speech_therapy_patients
    aws dynamodb describe-table --table-name mental_health_patients

# Add KMS verification
- name: Verify KMS Key
  run: |
    aws kms describe-key --key-id ${{ secrets.KMS_KEY_ID }}

# Add S3 bucket verification
- name: Verify S3 Buckets
  run: |
    aws s3 ls s3://arevclear
    aws s3 ls s3://arevclear-raw
    aws s3 ls s3://arevclear-exports
    aws s3 ls s3://arevclear-logs
```

**Action**: Add verification steps for existing resources

---

### 8. API Documentation Update
**File**: `docs/API_REFERENCE.md` (IF EXISTS)  
**Status**: ⚠️ **MAY NEED UPDATE**

**Changes Required**:
- Update base URL to match current setup
- Add DynamoDB-specific query patterns
- Document S3 upload endpoints
- Add KMS encryption notes

---

### 9. Backend Package.json Dependencies
**File**: `RevClear/backend/package.json`  
**Status**: ⚠️ **VERIFY DEPENDENCIES**

**Ensure These AWS SDK Packages Are Included**:
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.x.x",
    "@aws-sdk/lib-dynamodb": "^3.x.x",
    "@aws-sdk/client-s3": "^3.x.x",
    "@aws-sdk/client-kms": "^3.x.x",
    "@aws-sdk/client-cloudtrail": "^3.x.x",
    "@aws-sdk/client-cognito-identity-provider": "^3.x.x"
  }
}
```

**Action**: Verify and add missing AWS SDK packages

---

## 📋 Priority: LOW (Nice to Have)

### 10. Docker Compose Update
**File**: `docker-compose.yml` (IF EXISTS)  
**Status**: ⚠️ **MAY NEED UPDATE**

**Changes Required**:
- Remove PostgreSQL service (you're using DynamoDB)
- Add LocalStack for local DynamoDB testing (optional)
- Update environment variables

---

### 11. CI/CD Pipeline Documentation
**File**: `docs/CICD.md` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Document**:
- Current GitHub Actions workflows
- Amplify deployment process
- Future S3 + CloudFront migration plan
- Terraform deployment process

---

### 12. Cost Tracking Spreadsheet
**File**: `docs/COST_TRACKING.md` (CREATE THIS)  
**Status**: ❌ **MISSING**

**Include**:
- Monthly AWS bill breakdown
- Service-by-service costs
- Comparison to projections
- Optimization recommendations

---

## ✅ Already Complete

### ✓ DEPLOYMENT_STATUS.md
**Status**: ✅ **CREATED**  
Documents all existing infrastructure and roadmap

### ✓ REPO_STRUCTURE.md
**Status**: ✅ **CREATED**  
Documents repository organization

### ✓ Terraform Structure
**Status**: ✅ **CREATED**  
- Main configuration files
- Module structure
- Environment templates

### ✓ Documentation Folder
**Status**: ✅ **ORGANIZED**  
All docs moved to `docs/` folder

---

## 🎯 Recommended Action Plan

### This Week
1. **Update README.md** - Reflect current AWS setup
2. **Create .env.example files** - Document required environment variables
3. **Create aws.ts config** - Centralize AWS SDK configuration
4. **Verify package.json** - Ensure AWS SDK dependencies are installed

### Next Week
5. **Create terraform.tfvars** - Configure environment variables
6. **Create import script** - Import existing AWS resources
7. **Update GitHub Actions** - Add DynamoDB verification
8. **Test local development** - Ensure backend connects to DynamoDB

### Month 2
9. **Add API documentation** - Document DynamoDB endpoints
10. **Create cost tracking** - Monitor AWS spending
11. **Update Docker Compose** - Remove PostgreSQL references
12. **Document CI/CD** - Complete deployment process docs

---

## 🛠️ Quick Commands

### Check What Needs Updating
```bash
# In your repo root
grep -r "PostgreSQL" --exclude-dir=node_modules --exclude-dir=.git
grep -r "RDS" --exclude-dir=node_modules --exclude-dir=.git
grep -r "FastAPI" --exclude-dir=node_modules --exclude-dir=.git
```

### Verify Current AWS Resources
```bash
# List DynamoDB tables
aws dynamodb list-tables

# List S3 buckets
aws s3 ls

# Describe KMS key
aws kms describe-key --key-id 4ed14exxxxxxxx10-78de-4dxxbe-97xxx-xxxxxxxxxxx

# Check CloudTrail
aws cloudtrail describe-trails
```

### Test Backend Connectivity
```bash
# Test DynamoDB connection
aws dynamodb scan --table-name physical_therapy_patients --limit 1

# Test S3 access
aws s3 ls s3://arevclear/

# Test KMS access
aws kms list-aliases
```

---

## 📝 Notes

### Files That DON'T Need Updates
- ✅ Demo files (`Demo/` folder) - These are for GitHub Pages only
- ✅ Terraform modules (`terraform/modules/`) - These are templates
- ✅ GitHub workflows structure - Just need content updates
- ✅ `.gitignore` - Already updated for Terraform

### Files to Create From Scratch
- `RevClear/backend/.env.example`
- `RevClear/frontend/.env.example`
- `RevClear/backend/src/config/aws.ts`
- `terraform/environments/dev/terraform.tfvars`
- `terraform/import-existing.sh`

### Files to Update
- `README.md` (main)
- `RevClear/backend/package.json` (verify dependencies)
- `.github/workflows/aws-deploy.yml` (add DynamoDB checks)

---

## 🆘 Need Help?

If you need help with any of these updates:
1. **Environment files**: I can generate complete examples
2. **AWS config**: I can create the TypeScript module
3. **Terraform imports**: I can write the import commands
4. **README updates**: I can rewrite sections

Just ask! 🚀
