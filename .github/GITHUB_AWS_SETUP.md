# GitHub Actions + AWS Integration Setup Guide

This guide will help you connect PowerShell with GitHub Actions for AWS deployment on the `test-aws` branch.

## Prerequisites

1. AWS IAM User created with programmatic access
2. AWS Access Key ID and Secret Access Key
3. GitHub repository access to manage secrets

## Step 1: Configure AWS Credentials in GitHub

### Required GitHub Secrets

Go to your GitHub repository settings:
`https://github.com/hpppm/revclear/settings/secrets/actions`

Add the following secrets by clicking **"New repository secret"**:

### Core AWS Credentials (Required)

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | Your AWS Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your AWS Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS Region | `us-east-1` |

### AWS Service Configuration (Optional but Recommended)

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_USER_POOL_ID` | Cognito User Pool ID | `us-east-1_xxxxxxxxx` |
| `AWS_CLIENT_ID` | Cognito App Client ID | `1234567890abcdefghijklmnop` |
| `AWS_S3_BUCKET` | S3 Bucket for backend storage | `revclear-storage-test` |
| `AWS_S3_FRONTEND_BUCKET` | S3 Bucket for frontend hosting | `revclear-frontend-test` |

### Database Configuration (Optional)

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DB_HOST` | RDS Database endpoint | `revclear-db.xxxxx.us-east-1.rds.amazonaws.com` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `revclear_db` |
| `DB_USER` | Database username | `revclear_admin` |
| `DB_PASSWORD` | Database password | `your_secure_password` |

### Frontend Configuration (Optional)

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.revclear.com` |

## Step 2: Get Your AWS Credentials

### From AWS Console:

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Navigate to **Users** → Select your user
3. Go to **Security credentials** tab
4. Under **Access keys**, click **Create access key**
5. Choose **Application running outside AWS**
6. Download or copy the Access Key ID and Secret Access Key
   - ⚠️ **Important**: You can only see the secret access key once!

### From PowerShell (if you already have AWS CLI configured):

```powershell
# Get current caller identity
aws sts get-caller-identity

# List access keys for current user (replace with your username)
aws iam list-access-keys --user-name YOUR_USERNAME
```

## Step 3: Test the GitHub Actions Workflow

### Option 1: Push to test-aws branch

```powershell
# Make sure you're on test-aws branch
git checkout test-aws

# Make a small change (or create this file)
git add .
git commit -m "Configure GitHub Actions for AWS"
git push origin test-aws
```

### Option 2: Manual Trigger

1. Go to: `https://github.com/hpppm/revclear/actions`
2. Select **"AWS Deployment"** workflow
3. Click **"Run workflow"**
4. Select branch: `test-aws`
5. Choose environment: `test`
6. Click **"Run workflow"**

## Step 4: Verify the Workflow

After triggering the workflow, you should see:

1. **aws-setup** job - Verifies AWS connection and lists services
2. **deploy-backend** job - Builds and tests backend
3. **deploy-frontend** job - Builds frontend
4. **powershell-scripts** job - Runs PowerShell scripts with AWS integration

## Step 5: Connect PowerShell Locally with AWS

### Install AWS Tools for PowerShell

```powershell
# Install AWS Tools modules
Install-Module -Name AWS.Tools.Common -Force -AllowClobber
Install-Module -Name AWS.Tools.RDS -Force -AllowClobber
Install-Module -Name AWS.Tools.CognitoIdentityProvider -Force -AllowClobber
Install-Module -Name AWS.Tools.S3 -Force -AllowClobber
Install-Module -Name AWS.Tools.SecretsManager -Force -AllowClobber
```

### Configure AWS Credentials Locally

```powershell
# Set your credentials as environment variables (temporary)
$env:AWS_ACCESS_KEY_ID = "YOUR_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_SECRET_ACCESS_KEY"
$env:AWS_REGION = "us-east-1"

# Or use AWS CLI to configure
aws configure
```

### Test Your Connection

```powershell
# Test AWS connection
Get-STSCallerIdentity

# List Cognito User Pools
Get-CGIPUserPoolList -MaxResult 10

# List S3 Buckets
Get-S3Bucket

# List RDS Instances
Get-RDSDBInstance

# List users in Cognito User Pool (replace with your pool ID)
$userPoolId = "us-east-1_xxxxxxxxx"
Get-CGIPUserList -UserPoolId $userPoolId -Limit 10
```

## Step 6: Running PowerShell Scripts in GitHub Actions

The workflow includes a `powershell-scripts` job that runs on Windows and can execute your PowerShell scripts.

### Example: List Cognito Users

The workflow automatically lists users in your Cognito User Pool if `AWS_USER_POOL_ID` secret is configured.

### Example: Run Custom Scripts

Place your PowerShell scripts in `RevClear/backend/` and they will be accessible in the workflow.

## Troubleshooting

### Issue: "Access Denied" errors

**Solution**: Ensure your IAM user has the necessary permissions:
- `AmazonRDSFullAccess` (or specific RDS permissions)
- `AmazonCognitoPowerUser` 
- `AmazonS3FullAccess` (or specific bucket permissions)
- `SecretsManagerReadWrite`
- `CloudWatchLogsFullAccess`

### Issue: Secrets not working

**Solution**: 
1. Verify secrets are added at repository level (not environment level)
2. Check secret names match exactly (case-sensitive)
3. Re-create secrets if needed

### Issue: PowerShell job fails

**Solution**:
1. Check the job logs for specific errors
2. Verify AWS Tools for PowerShell installation succeeded
3. Ensure credentials are properly passed to the job

## Workflow Features

### 1. Automatic Triggers
- Runs on push to `test-aws` or `aws-migration` branches
- Runs on pull requests targeting these branches
- Manual trigger available with environment selection

### 2. AWS Connection Verification
- Tests AWS credentials
- Lists all AWS resources (RDS, Cognito, S3, Secrets Manager)
- Verifies AWS SDK connectivity

### 3. Backend Deployment
- Installs dependencies
- Builds TypeScript code
- Tests AWS SDK connection
- Can run database migrations

### 4. Frontend Deployment
- Builds Next.js application
- Can deploy to S3 bucket (if configured)

### 5. PowerShell Integration
- Runs on Windows environment
- Installs AWS Tools for PowerShell
- Can execute custom PowerShell scripts
- Lists Cognito users

## Next Steps

1. ✅ Configure GitHub Secrets (Step 1)
2. ✅ Push to test-aws branch (Step 3)
3. ✅ Verify workflow runs successfully
4. ✅ Test PowerShell integration locally (Step 5)
5. 🔄 Add your custom deployment scripts
6. 🔄 Configure additional AWS services as needed

## Useful Links

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS Actions Configure Credentials](https://github.com/aws-actions/configure-aws-credentials)
- [AWS Tools for PowerShell](https://aws.amazon.com/powershell/)
- [Your Repository Secrets](https://github.com/hpppm/revclear/settings/secrets/actions)
- [Your Actions Workflows](https://github.com/hpppm/revclear/actions)

---

**Need Help?** Check the workflow logs at: `https://github.com/hpppm/revclear/actions`
