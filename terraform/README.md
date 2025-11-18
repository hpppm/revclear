# Terraform Infrastructure

## Setup

```bash
# Load environment variables
source ../.env

# Initialize with backend config
terraform init -backend-config="bucket=${BUCKET_TERRAFORM}"

# Create terraform.tfvars from example
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Deploy
terraform plan
terraform apply
```

## Resources Created

**Authentication**
- Cognito User Pool + Identity Pool
- IAM roles: ClinicARole, ClinicBRole, ClinicCRole
- IAM policies for tenant isolation

**Data Storage**
- DynamoDB tables: mental_health_patients, physical_therapy_patients, speech_therapy_patients
- S3 bucket: arevclear (with tenant folders)
- KMS encryption key

**Security**
- CloudTrail audit logging
- IAM role trust policies
- Resource tagging (HIPAA=enabled, Environment=prod)

## Current Cost

~$35/month for deployed infrastructure
