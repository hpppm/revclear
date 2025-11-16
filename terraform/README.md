# Terraform Infrastructure

AWS infrastructure as code for multi-tenant healthcare system

## Prerequisites

```bash
# Install Terraform and AWS CLI
aws configure  # Use account 414669980881
```

## Deploy

```bash
terraform init
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
