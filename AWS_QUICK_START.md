# RevClear AWS Quick Start

**Time to deploy: ~15 minutes**

## Step 1: Install AWS CLI (2 minutes)

```powershell
# Download and install AWS CLI
# Visit: https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify
aws --version
```

## Step 2: Configure AWS (1 minute)

```powershell
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Region: us-east-1
# - Output: json
```

## Step 3: Create AWS Services (10 minutes)

**Option A - Windows PowerShell (Recommended):**

```powershell
cd RevClear\backend
# Copy commands from aws-cli-commands.txt and run them
```

**Option B - Git Bash/WSL:**

```bash
cd RevClear/backend
chmod +x aws-services.sh
./aws-services.sh
```

This creates:
- ✅ PostgreSQL database (RDS)
- ✅ File storage (S3)
- ✅ User authentication (Cognito)
- ✅ Logging (CloudWatch)
- ✅ Secure credentials (Secrets Manager)

## Step 4: Install Dependencies (1 minute)

```powershell
cd RevClear\backend
npm install @aws-sdk/client-rds-data @aws-sdk/client-secrets-manager @aws-sdk/client-cognito-identity-provider @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-cloudwatch-logs jwks-rsa jsonwebtoken
```

## Step 5: Configure Environment (1 minute)

Create `RevClear/backend/.env`:

```env
AWS_REGION=us-east-1
AWS_USER_POOL_ID=<from-step-3>
AWS_CLIENT_ID=<from-step-3>
AWS_S3_BUCKET=revclear-storage-production
DB_HOST=<from-step-3>
DB_PORT=5432
DB_NAME=revclear_db
DB_USER=revclear_admin
DB_PASSWORD=ChangeThisPassword123!
AWS_SECRET_NAME=revclear/database/credentials
```

## Step 6: Setup Database Schema

```powershell
# Wait for database to be ready (check status)
aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].DBInstanceStatus'

# Get database endpoint
$DB_HOST = aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].Endpoint.Address' --output text

# Connect and setup (requires psql)
psql -h $DB_HOST -U revclear_admin -d postgres
CREATE DATABASE revclear_db;
\q

# Run schema
psql -h $DB_HOST -U revclear_admin -d revclear_db -f Documentation\db\002_cloud_db_schema.sql
```

## Step 7: Deploy Backend

```powershell
cd RevClear\backend

# Build and deploy
npm run build
./aws-deploy.sh

# Or deploy to ECS (if configured)
```

## Quick Commands

```powershell
# Check all services
aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].DBInstanceStatus'
aws s3 ls s3://revclear-storage-production
aws cognito-idp list-user-pools --max-results 10
aws logs tail /aws/revclear/production --follow

# View logs
aws logs tail /aws/revclear/production --follow

# Check costs
aws ce get-cost-and-usage --time-period Start=2025-11-01,End=2025-11-30 --granularity MONTHLY --metrics BlendedCost
```

## Troubleshooting

**Database won't connect:**
```powershell
# Check status
aws rds describe-db-instances --db-instance-identifier revclear-db

# Check security group
aws rds describe-db-instances --db-instance-identifier revclear-db --query 'DBInstances[0].VpcSecurityGroups'
```

**Cognito errors:**
```powershell
# Verify user pool
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID
```

## Cost Estimate

- RDS (db.t3.micro): ~$15/month
- S3: ~$0.50/month
- Cognito: Free (up to 50K users)
- CloudWatch: ~$5/month
- Secrets Manager: ~$0.50/month

**Total: ~$21/month**

## Next Steps

1. ✅ AWS services running
2. ✅ Backend configured
3. 📝 Setup frontend with AWS Amplify
4. 📝 Configure custom domain
5. 📝 Enable auto-scaling
6. 📝 Setup monitoring alerts

---

**Need Help?**
- Check: `AWS_SETUP_GUIDE.md` for detailed instructions
- View logs: `aws logs tail /aws/revclear/production --follow`
- AWS Support: https://console.aws.amazon.com/support/
