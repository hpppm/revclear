# RevClear AWS Setup Guide

Simple guide to deploy RevClear on AWS.

## Prerequisites

1. Install AWS CLI:
```bash
# Windows (PowerShell)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
```

2. Configure AWS credentials:
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

## Quick Setup (5 Minutes)

### Step 1: Create AWS Services

```bash
# Navigate to backend folder
cd RevClear/backend

# Make script executable (Mac/Linux)
chmod +x aws-services.sh

# Run setup script
./aws-services.sh
```

**Windows PowerShell:**
```powershell
# Run commands manually from aws-cli-commands.txt
# Or use Git Bash / WSL
```

### Step 2: Wait for Database

```bash
# Check if database is ready (takes 5-10 minutes)
aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].DBInstanceStatus'

# Get database endpoint when ready
aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].Endpoint.Address' --output text
```

### Step 3: Update Environment Variables

Create `RevClear/backend/.env`:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Database (RDS PostgreSQL)
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=revclear_db
DB_USER=revclear_admin
DB_PASSWORD=ChangeThisPassword123!

# Cognito Authentication
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_CLIENT_ID=your_client_id
AWS_REGION=us-east-1

# S3 Storage
AWS_S3_BUCKET=revclear-storage-production

# Secrets Manager
AWS_SECRET_NAME=revclear/database/credentials
```

### Step 4: Deploy Application

```bash
# Deploy backend
./aws-deploy.sh
```

## AWS Services Used

| Service | Purpose | Cost (Estimated) |
|---------|---------|------------------|
| **RDS PostgreSQL** | Database | ~$15/month (t3.micro) |
| **S3** | File storage | ~$0.50/month (50GB) |
| **Cognito** | User authentication | Free tier (50K MAU) |
| **CloudWatch** | Logging & monitoring | ~$5/month |
| **Secrets Manager** | Secure credentials | ~$0.50/month |
| **ECR** | Container registry | ~$1/month (10GB) |

**Total: ~$22/month** for small-medium traffic

## Quick Commands

### Check Services Status
```bash
# RDS Database
aws rds describe-db-instances --db-instance-identifier revclear-db

# S3 Bucket
aws s3 ls s3://revclear-storage-production

# Cognito User Pool
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID

# CloudWatch Logs
aws logs tail /aws/revclear/production --follow
```

### Database Setup
```bash
# Connect to RDS database
psql -h YOUR_RDS_ENDPOINT -U revclear_admin -d postgres

# Create database
CREATE DATABASE revclear_db;

# Run schema
psql -h YOUR_RDS_ENDPOINT -U revclear_admin -d revclear_db -f Documentation/db/002_cloud_db_schema.sql
```

### Useful Commands
```bash
# View logs
aws logs tail /aws/revclear/production --follow

# Check database status
aws rds describe-db-instances --db-instance-identifier revclear-db

# List S3 files
aws s3 ls s3://revclear-storage-production --recursive

# Get secret value
aws secretsmanager get-secret-value --secret-id revclear/database/credentials
```

## Troubleshooting

### Database Connection Issues
```bash
# Check security group allows your IP
aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].VpcSecurityGroups'

# Modify security group to allow connections
aws ec2 authorize-security-group-ingress \
    --group-id YOUR_SECURITY_GROUP_ID \
    --protocol tcp \
    --port 5432 \
    --cidr YOUR_IP/32
```

### Authentication Issues
```bash
# Verify Cognito user pool
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID

# Create test user
aws cognito-idp admin-create-user \
    --user-pool-id YOUR_POOL_ID \
    --username testuser \
    --user-attributes Name=email,Value=test@example.com
```

## Cleanup (Delete Everything)

```bash
# Delete RDS instance
aws rds delete-db-instance --db-instance-identifier revclear-db --skip-final-snapshot

# Delete S3 bucket (empty it first)
aws s3 rm s3://revclear-storage-production --recursive
aws s3api delete-bucket --bucket revclear-storage-production

# Delete Cognito user pool
aws cognito-idp delete-user-pool --user-pool-id YOUR_POOL_ID

# Delete CloudWatch log group
aws logs delete-log-group --log-group-name /aws/revclear/production

# Delete secret
aws secretsmanager delete-secret --secret-id revclear/database/credentials --force-delete-without-recovery
```

## Next Steps

1. ✅ Set up AWS services
2. ✅ Configure environment variables
3. ✅ Deploy backend
4. 📝 Set up custom domain (Route 53)
5. 📝 Configure SSL certificate (ACM)
6. 📝 Set up load balancer (ALB)
7. 📝 Configure auto-scaling (ECS)

## Support

For issues, check:
- AWS Service Health Dashboard
- CloudWatch Logs: `/aws/revclear/production`
- RDS Events in AWS Console

---

**Security Note:** Change default passwords immediately in production!
