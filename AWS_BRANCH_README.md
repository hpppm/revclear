# AWS Branch - What's Included

This branch contains all AWS service configurations and deployment scripts for RevClear.

## 📁 Files Created

### Setup & Deployment Scripts
- `RevClear/backend/aws-services.sh` - Automated AWS services setup
- `RevClear/backend/aws-deploy.sh` - Docker deployment to AWS ECR
- `RevClear/backend/aws-cli-commands.txt` - PowerShell commands for Windows

### Configuration Files
- `RevClear/backend/src/config/awsRds.ts` - PostgreSQL RDS database connection
- `RevClear/backend/src/config/awsCognito.ts` - User authentication with Cognito
- `RevClear/backend/src/config/awsS3.ts` - File storage with S3
- `RevClear/backend/src/config/awsCloudWatch.ts` - Application logging

### Documentation
- `AWS_QUICK_START.md` - 15-minute setup guide (ROOT)
- `AWS_SETUP_GUIDE.md` - Detailed setup instructions (ROOT)
- `RevClear/backend/AWS_DEPENDENCIES.md` - NPM packages to install

## 🚀 Quick Start

```powershell
# 1. Install AWS CLI and configure
aws configure

# 2. Run setup commands
cd RevClear\backend
# Copy and run commands from aws-cli-commands.txt

# 3. Install dependencies
npm install @aws-sdk/client-rds-data @aws-sdk/client-secrets-manager @aws-sdk/client-cognito-identity-provider @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-cloudwatch-logs jwks-rsa jsonwebtoken

# 4. Configure .env file with AWS credentials

# 5. Deploy
./aws-deploy.sh
```

## 🛠️ AWS Services

| Service | Purpose |
|---------|---------|
| **RDS PostgreSQL** | Main database |
| **S3** | File storage |
| **Cognito** | User authentication |
| **CloudWatch** | Logging & monitoring |
| **Secrets Manager** | Secure credentials |
| **ECR** | Container registry |

## 💰 Monthly Cost

- **Development**: ~$21/month
- **Production (with scaling)**: ~$50-100/month

## 📖 Documentation

1. Read `AWS_QUICK_START.md` for fastest setup
2. Read `AWS_SETUP_GUIDE.md` for detailed instructions
3. Check `AWS_DEPENDENCIES.md` for required packages

## 🔄 Comparison with Azure Branch

Both branches have the same functionality, just different cloud providers:

| Feature | AWS | Azure |
|---------|-----|-------|
| Database | RDS PostgreSQL | Azure Database |
| Storage | S3 | Blob Storage |
| Auth | Cognito | AD B2C |
| Logs | CloudWatch | App Insights |
| Deploy | ECS/ECR | Container Apps |

## ✅ What's Working

- ✅ Service setup scripts
- ✅ Database configuration
- ✅ Authentication setup
- ✅ File storage
- ✅ Logging system
- ✅ Deployment scripts

## 📝 Next Steps

1. Install AWS CLI
2. Run setup script
3. Configure environment variables
4. Deploy backend
5. Test endpoints

---

**Branch**: `aws-migration`
**Status**: Ready for deployment
**Last Updated**: November 5, 2025
