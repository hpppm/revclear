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
