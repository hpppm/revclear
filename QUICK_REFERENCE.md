# Quick Reference: PowerShell + GitHub Actions + AWS

## Local PowerShell Commands

### Install AWS Tools
```powershell
Install-Module -Name AWS.Tools.Common -Force -AllowClobber
Install-Module -Name AWS.Tools.CognitoIdentityProvider -Force -AllowClobber
Install-Module -Name AWS.Tools.S3 -Force -AllowClobber
Install-Module -Name AWS.Tools.RDS -Force -AllowClobber
```

### Configure AWS Credentials (Session Only)
```powershell
$env:AWS_ACCESS_KEY_ID = "YOUR_ACCESS_KEY"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_SECRET_KEY"
$env:AWS_REGION = "us-east-1"
```

### Test AWS Connection
```powershell
# Get caller identity
Get-STSCallerIdentity

# List Cognito User Pools
Get-CGIPUserPoolList -MaxResult 10

# List users in a specific pool
$poolId = "us-east-1_xxxxxxxxx"
Get-CGIPUserList -UserPoolId $poolId -Limit 50

# List S3 buckets
Get-S3Bucket

# List RDS instances
Get-RDSDBInstance
```

## Git Commands for test-aws Branch

### Switch to test-aws branch
```powershell
git checkout test-aws
```

### Commit and push changes
```powershell
git add .
git commit -m "Configure AWS integration"
git push origin test-aws
```

### Create test-aws branch if it doesn't exist
```powershell
git checkout -b test-aws
git push -u origin test-aws
```

## GitHub Secrets to Configure

Go to: https://github.com/hpppm/revclear/settings/secrets/actions

### Required Secrets:
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - AWS region (e.g., us-east-1)

### Optional Secrets:
- `AWS_USER_POOL_ID` - Cognito User Pool ID
- `AWS_CLIENT_ID` - Cognito App Client ID
- `AWS_S3_BUCKET` - S3 bucket name
- `DB_HOST` - RDS endpoint
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

## Triggering GitHub Actions

### Method 1: Push to branch
```powershell
git push origin test-aws
```

### Method 2: Manual trigger
1. Go to https://github.com/hpppm/revclear/actions
2. Select "AWS Deployment" workflow
3. Click "Run workflow"
4. Select branch: `test-aws`
5. Click "Run workflow"

## Viewing Workflow Results

- Actions page: https://github.com/hpppm/revclear/actions
- Check job logs for detailed output
- View summary in each workflow run

## Quick Setup Script

Run this script to set up everything:
```powershell
.\setup-aws-github.ps1
```

## Troubleshooting

### "Execution Policy" error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Access Denied" from AWS
- Verify credentials are correct
- Check IAM user permissions
- Ensure user has programmatic access enabled

### GitHub Actions failing
- Check secrets are configured in GitHub
- Verify secret names match exactly (case-sensitive)
- Review workflow logs for specific errors

## Files Created

- `.github/workflows/aws-deploy.yml` - GitHub Actions workflow
- `.github/GITHUB_AWS_SETUP.md` - Detailed setup guide
- `setup-aws-github.ps1` - Interactive setup script
- `QUICK_REFERENCE.md` - This file

## Useful Links

- [GitHub Secrets](https://github.com/hpppm/revclear/settings/secrets/actions)
- [GitHub Actions](https://github.com/hpppm/revclear/actions)
- [AWS IAM Console](https://console.aws.amazon.com/iam/)
- [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
