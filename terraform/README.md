# RevClear Terraform Infrastructure

This directory contains Infrastructure as Code (IaC) for deploying the RevClear Healthcare Claims Management Platform on AWS using Terraform.

## 📁 Directory Structure

```
terraform/
├── main.tf                 # Main Terraform configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── providers.tf            # Provider configuration
├── README.md               # This file
├── environments/           # Environment-specific configurations
│   ├── dev/               # Development environment
│   ├── staging/           # Staging environment
│   └── prod/              # Production environment
└── modules/               # Reusable Terraform modules
    ├── networking/        # VPC, subnets, NAT, IGW
    ├── compute/           # ECS Fargate, ALB, ECR
    ├── database/          # RDS PostgreSQL
    ├── storage/           # S3 buckets
    ├── ai-services/       # Transcribe, Bedrock, Lambda
    └── security/          # IAM, KMS, Cognito, WAF, Security Groups
```

## 🚀 Quick Start

### Prerequisites

1. **Install Terraform** (v1.0+)
   ```bash
   # Windows (using Chocolatey)
   choco install terraform

   # Or download from: https://www.terraform.io/downloads
   ```

2. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

3. **AWS IAM Permissions** - Your AWS user/role needs permissions to create:
   - VPC, Subnets, Security Groups
   - ECS, Fargate, ECR, ALB
   - RDS, S3, KMS
   - Cognito, IAM roles
   - CloudWatch, CloudTrail
   - Lambda, Transcribe, Bedrock (if enabled)

### Initial Setup

1. **Create S3 backend bucket** (one-time setup):
   ```bash
   aws s3 mb s3://revclear-terraform-state --region us-east-1
   aws s3api put-bucket-versioning --bucket revclear-terraform-state --versioning-configuration Status=Enabled
   ```

2. **Create DynamoDB table for state locking**:
   ```bash
   aws dynamodb create-table \
     --table-name revclear-terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   ```

3. **Initialize Terraform**:
   ```bash
   cd terraform
   terraform init
   ```

## 📝 Usage

### Development Environment

```bash
# Plan changes
terraform plan -var-file="environments/dev/terraform.tfvars"

# Apply changes
terraform apply -var-file="environments/dev/terraform.tfvars"

# Destroy resources
terraform destroy -var-file="environments/dev/terraform.tfvars"
```

### Production Environment

```bash
# Plan with production variables
terraform plan -var-file="environments/prod/terraform.tfvars"

# Apply (requires approval)
terraform apply -var-file="environments/prod/terraform.tfvars"
```

## 🏗️ Architecture Components

### 1. Networking Module
- **VPC** - Private cloud network
- **Subnets** - Public, private, and database subnets across 3 AZs
- **Internet Gateway** - Internet access for public subnets
- **NAT Gateway** - Outbound internet for private subnets
- **Route Tables** - Traffic routing configuration

### 2. Security Module
- **Security Groups** - Firewall rules for ALB, ECS, RDS
- **KMS** - Encryption keys for data at rest
- **IAM Roles** - Service permissions and access control
- **AWS Cognito** - User authentication with MFA
- **AWS WAF** - Web application firewall (optional)
- **CloudTrail** - Audit logging for HIPAA compliance

### 3. Storage Module
- **S3 Buckets**:
  - Audio files (patient recordings)
  - Documents (SOAP notes, JSON)
  - Claims (EDI 837 files)
  - CloudTrail logs
- **Lifecycle Policies** - Automatic archival to Glacier
- **Versioning** - File version history
- **Encryption** - Server-side encryption with KMS

### 4. Database Module
- **RDS PostgreSQL** - Multi-AZ relational database
- **Subnet Group** - Database subnet placement
- **Parameter Group** - Database configuration
- **Secrets Manager** - Encrypted credentials storage
- **Automated Backups** - 7-day retention (configurable)

### 5. Compute Module
- **ECS Cluster** - Container orchestration
- **Fargate** - Serverless container compute
- **ALB** - Application Load Balancer with HTTPS
- **ECR** - Docker image registry
- **CloudWatch Logs** - Application logging
- **Auto Scaling** - Dynamic capacity management

### 6. AI Services Module
- **IAM Roles** - Permissions for AI services
- **Lambda Functions** - Serverless AI orchestration
- **Transcribe Access** - Audio-to-text conversion
- **Bedrock Access** - LLM for SOAP notes and coding
- **CloudWatch Logs** - AI processing logs

## 🔧 Configuration Variables

### Required Variables

```hcl
environment     = "dev"           # dev, staging, or prod
aws_region      = "us-east-1"     # AWS region
project_name    = "revclear"      # Project identifier
```

### Networking Variables

```hcl
vpc_cidr                = "10.0.0.0/16"
availability_zones      = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs    = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
database_subnet_cidrs   = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
```

### Compute Variables

```hcl
fargate_cpu            = 512      # 0.5 vCPU
fargate_memory         = 1024     # 1 GB RAM
app_count              = 2        # Number of tasks
container_image        = "your-ecr-repo/app:latest"
```

### Database Variables

```hcl
db_instance_class            = "db.t3.medium"
db_allocated_storage         = 100            # GB
db_backup_retention_period   = 7              # days
db_multi_az                  = true
```

### Security Variables

```hcl
enable_waf                   = true
cognito_mfa_configuration    = "OPTIONAL"
cloudwatch_log_retention_days = 2555  # 7 years for HIPAA
```

## 📊 Outputs

After applying Terraform, you'll get important values:

```bash
# View all outputs
terraform output

# View specific output
terraform output alb_dns_name
terraform output rds_endpoint
terraform output cognito_user_pool_id
```

## 🔐 Security Best Practices

1. **State File Security**
   - Store state in S3 with encryption
   - Enable versioning on state bucket
   - Use DynamoDB for state locking
   - Never commit `.tfstate` files to Git

2. **Secrets Management**
   - Use AWS Secrets Manager for credentials
   - Mark sensitive outputs as `sensitive = true`
   - Use environment variables for secrets
   - Rotate credentials regularly

3. **Access Control**
   - Use IAM roles instead of access keys
   - Follow principle of least privilege
   - Enable MFA for Cognito users
   - Review security group rules

4. **Compliance**
   - Enable CloudTrail logging
   - Set 7-year log retention (HIPAA)
   - Encrypt all data at rest and in transit
   - Regular security audits

## 💰 Cost Estimation

### Development Environment (~$300-400/month)
- **ECS Fargate** (1 task): ~$30-40
- **RDS** (db.t3.small): ~$30-40
- **NAT Gateway**: ~$30-35
- **S3**: ~$5-10
- **ALB**: ~$20-25
- **CloudWatch/CloudTrail**: ~$10-20
- **AI Services** (usage-based): ~$50-100
- **Data Transfer**: ~$10-20

### Production Environment (~$600-800/month)
- **ECS Fargate** (4 tasks): ~$120-160
- **RDS** (db.t3.medium, Multi-AZ): ~$120-150
- **NAT Gateway** (3 AZs): ~$90-105
- **S3**: ~$20-30
- **ALB**: ~$25-30
- **CloudWatch/CloudTrail**: ~$30-50
- **AI Services** (usage-based): ~$150-250
- **Data Transfer**: ~$30-50

### Cost Optimization Tips
- Use Reserved Instances for RDS (40% savings)
- Implement S3 lifecycle policies
- Use Lambda instead of always-on Fargate for low traffic
- Monitor and alert on cost anomalies
- Use AWS Cost Explorer

## 🐛 Troubleshooting

### Common Issues

**1. "Backend initialization failed"**
```bash
# Solution: Create backend resources first
aws s3 mb s3://revclear-terraform-state
```

**2. "Insufficient permissions"**
```bash
# Solution: Check IAM permissions
aws iam get-user
aws sts get-caller-identity
```

**3. "Resource already exists"**
```bash
# Solution: Import existing resource
terraform import aws_s3_bucket.example bucket-name
```

**4. "State lock error"**
```bash
# Solution: Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

### Debugging

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform apply

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Show current state
terraform show
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Terraform Deploy
on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2
      
      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform
        
      - name: Terraform Plan
        run: terraform plan
        working-directory: ./terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: ./terraform
        if: github.ref == 'refs/heads/main'
```

## 📚 Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [HIPAA Compliance on AWS](https://aws.amazon.com/compliance/hipaa-compliance/)
- [RevClear Architecture Diagrams](../docs/ARCHITECTURE_DIAGRAMS.md)
- [AWS Cost Management Guide](../docs/AWS_COST_MANAGEMENT.md)

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review AWS service quotas and limits
3. Consult Terraform documentation
4. Open an issue in the repository

---

**Last Updated**: November 8, 2025  
**Terraform Version**: >= 1.0  
**AWS Provider Version**: ~> 5.0
