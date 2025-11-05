# RevClear AWS Setup - Cost Optimized for $100/month Budget
# All configurations use variables - easy to edit!

# ============================================
# 🎯 CONFIGURATION VARIABLES - EDIT THESE
# ============================================

# Project Settings
$PROJECT_NAME = "revclear"
$ENVIRONMENT = "dev"  # Options: dev, staging, production
$REGION = "us-east-1"  # Cheapest region

# Database Settings
$DB_IDENTIFIER = "${PROJECT_NAME}-db-${ENVIRONMENT}"
$DB_INSTANCE_CLASS = "db.t3.micro"  # FREE TIER ELIGIBLE! ($0 for 750 hours/month first year)
$DB_STORAGE = 20  # GB - FREE TIER: 20GB included
$DB_USERNAME = "revclear_admin"
$DB_PASSWORD = "ChangeThisPassword123!"  # ⚠️ CHANGE IN PRODUCTION!
$DB_NAME = "revclear_db"

# S3 Settings
$S3_BUCKET = "${PROJECT_NAME}-storage-${ENVIRONMENT}"

# Cognito Settings
$COGNITO_POOL_NAME = "${PROJECT_NAME}-users-${ENVIRONMENT}"
$COGNITO_CLIENT_NAME = "${PROJECT_NAME}-client-${ENVIRONMENT}"

# CloudWatch Settings
$LOG_GROUP = "/aws/${PROJECT_NAME}/${ENVIRONMENT}"
$LOG_RETENTION_DAYS = 7  # Reduced from 30 to save costs

# Secrets Manager
$SECRET_NAME = "${PROJECT_NAME}/${ENVIRONMENT}/database/credentials"

# ECR Settings
$ECR_REPO = "${PROJECT_NAME}-backend-${ENVIRONMENT}"

# Tags (for cost tracking)
$TAGS = "Key=Project,Value=${PROJECT_NAME} Key=Environment,Value=${ENVIRONMENT} Key=CostCenter,Value=Development"

# ============================================
# 💰 COST ESTIMATES WITH THESE SETTINGS
# ============================================
# RDS db.t3.micro (FREE TIER 1st year): $0 (then ~$15/month)
# S3 (50GB): ~$1/month
# Cognito (< 50K users): FREE
# CloudWatch (7-day logs): ~$1/month
# Secrets Manager: ~$0.50/month
# ECR (10GB): ~$1/month
# Lambda (100K invocations): ~$2/month
# SQS: ~$0.50/month
# SNS: ~$2/month
# TOTAL WITHOUT AI: ~$8/month (first year FREE with RDS)
# 
# ⚠️ EXPENSIVE SERVICES (Add only when needed):
# - Transcribe Medical: $25/1000 min (~$25-50/month)
# - Comprehend Medical: $10/10K units (~$10-20/month)
# - WAF: ~$5/month
# TOTAL WITH AI: ~$48-83/month
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RevClear AWS Setup - Budget Optimized" -ForegroundColor Cyan
Write-Host "Environment: $ENVIRONMENT" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host "Estimated Cost: ~$8/month (without AI services)" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

# ============================================
# 1. CREATE RDS DATABASE (FREE TIER)
# ============================================
Write-Host "[1/6] Creating RDS Database..." -ForegroundColor Green
Write-Host "Instance: $DB_INSTANCE_CLASS (FREE TIER eligible)" -ForegroundColor Yellow

aws rds create-db-instance `
    --db-instance-identifier $DB_IDENTIFIER `
    --db-instance-class $DB_INSTANCE_CLASS `
    --engine postgres `
    --engine-version 15.3 `
    --master-username $DB_USERNAME `
    --master-user-password $DB_PASSWORD `
    --allocated-storage $DB_STORAGE `
    --storage-type gp3 `
    --storage-encrypted `
    --publicly-accessible `
    --backup-retention-period 3 `
    --region $REGION `
    --tags $TAGS

Write-Host "✓ Database creation initiated" -ForegroundColor Green
Write-Host "Waiting for database to be ready (5-10 min)..." -ForegroundColor Yellow
aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER --region $REGION

$DB_HOST = aws rds describe-db-instances `
    --db-instance-identifier $DB_IDENTIFIER `
    --query 'DBInstances[0].Endpoint.Address' `
    --output text `
    --region $REGION

Write-Host "✓ Database ready: $DB_HOST`n" -ForegroundColor Green

# ============================================
# 2. CREATE S3 BUCKET
# ============================================
Write-Host "[2/6] Creating S3 Bucket..." -ForegroundColor Green

aws s3api create-bucket `
    --bucket $S3_BUCKET `
    --region $REGION

# Lifecycle policy to reduce storage costs
$lifecyclePolicy = @"
{
    "Rules": [{
        "Id": "DeleteOldAudio",
        "Status": "Enabled",
        "Prefix": "audio/",
        "Expiration": {
            "Days": 90
        }
    }]
}
"@

$lifecyclePolicy | aws s3api put-bucket-lifecycle-configuration `
    --bucket $S3_BUCKET `
    --lifecycle-configuration file:///dev/stdin

Write-Host "✓ S3 bucket created with 90-day lifecycle policy`n" -ForegroundColor Green

# ============================================
# 3. CREATE COGNITO USER POOL (FREE)
# ============================================
Write-Host "[3/6] Creating Cognito User Pool..." -ForegroundColor Green
Write-Host "Cost: FREE (up to 50,000 monthly active users)" -ForegroundColor Yellow

$USER_POOL_ID = aws cognito-idp create-user-pool `
    --pool-name $COGNITO_POOL_NAME `
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" `
    --auto-verified-attributes email `
    --username-attributes email `
    --region $REGION `
    --query 'UserPool.Id' `
    --output text

$CLIENT_ID = aws cognito-idp create-user-pool-client `
    --user-pool-id $USER_POOL_ID `
    --client-name $COGNITO_CLIENT_NAME `
    --no-generate-secret `
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH `
    --region $REGION `
    --query 'UserPoolClient.ClientId' `
    --output text

Write-Host "✓ Cognito User Pool: $USER_POOL_ID" -ForegroundColor Green
Write-Host "✓ Client ID: $CLIENT_ID`n" -ForegroundColor Green

# ============================================
# 4. CREATE CLOUDWATCH LOG GROUP
# ============================================
Write-Host "[4/6] Creating CloudWatch Log Group..." -ForegroundColor Green
Write-Host "Retention: $LOG_RETENTION_DAYS days (to reduce costs)" -ForegroundColor Yellow

aws logs create-log-group `
    --log-group-name $LOG_GROUP `
    --region $REGION

aws logs put-retention-policy `
    --log-group-name $LOG_GROUP `
    --retention-in-days $LOG_RETENTION_DAYS `
    --region $REGION

Write-Host "✓ CloudWatch Log Group created`n" -ForegroundColor Green

# ============================================
# 5. CREATE SECRETS MANAGER SECRET
# ============================================
Write-Host "[5/6] Creating Secrets Manager..." -ForegroundColor Green

$secretJson = @"
{
    "username": "$DB_USERNAME",
    "password": "$DB_PASSWORD",
    "engine": "postgres",
    "host": "$DB_HOST",
    "port": 5432,
    "dbname": "$DB_NAME"
}
"@

$secretJson | aws secretsmanager create-secret `
    --name $SECRET_NAME `
    --description "Database credentials for RevClear $ENVIRONMENT" `
    --secret-string file:///dev/stdin `
    --region $REGION

Write-Host "✓ Secrets Manager secret created`n" -ForegroundColor Green

# ============================================
# 6. CREATE ECR REPOSITORY
# ============================================
Write-Host "[6/6] Creating ECR Repository..." -ForegroundColor Green

aws ecr create-repository `
    --repository-name $ECR_REPO `
    --region $REGION `
    --image-scanning-configuration scanOnPush=true `
    --encryption-configuration encryptionType=AES256

Write-Host "✓ ECR repository created`n" -ForegroundColor Green

# ============================================
# 🎉 SETUP COMPLETE
# ============================================
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "✓ AWS SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

# ============================================
# 📋 SAVE THESE TO YOUR .env FILE
# ============================================
Write-Host "📋 Copy these to RevClear/backend/.env:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "# AWS Configuration"
Write-Host "AWS_REGION=$REGION"
Write-Host "AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)"
Write-Host ""
Write-Host "# Database"
Write-Host "DB_HOST=$DB_HOST"
Write-Host "DB_PORT=5432"
Write-Host "DB_NAME=$DB_NAME"
Write-Host "DB_USER=$DB_USERNAME"
Write-Host "DB_PASSWORD=$DB_PASSWORD"
Write-Host ""
Write-Host "# Cognito"
Write-Host "AWS_USER_POOL_ID=$USER_POOL_ID"
Write-Host "AWS_CLIENT_ID=$CLIENT_ID"
Write-Host ""
Write-Host "# S3"
Write-Host "AWS_S3_BUCKET=$S3_BUCKET"
Write-Host ""
Write-Host "# Secrets Manager"
Write-Host "AWS_SECRET_NAME=$SECRET_NAME"
Write-Host ""
Write-Host "# CloudWatch"
Write-Host "AWS_LOG_GROUP=$LOG_GROUP"
Write-Host "============================================`n" -ForegroundColor Yellow

# ============================================
# 💰 COST MONITORING COMMANDS
# ============================================
Write-Host "💰 Cost Monitoring Commands:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "# Check current month costs:"
Write-Host 'aws ce get-cost-and-usage --time-period Start=$(Get-Date -Format "yyyy-MM-01"),End=$(Get-Date -Format "yyyy-MM-dd") --granularity MONTHLY --metrics BlendedCost'
Write-Host ""
Write-Host "# Set billing alert (run once):"
Write-Host 'aws cloudwatch put-metric-alarm --alarm-name revclear-billing-alert --alarm-description "Alert when costs exceed $80" --metric-name EstimatedCharges --namespace AWS/Billing --statistic Maximum --period 21600 --threshold 80 --comparison-operator GreaterThanThreshold --evaluation-periods 1'
Write-Host "============================================`n" -ForegroundColor Yellow

# ============================================
# 🎯 NEXT STEPS
# ============================================
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "1. Copy the .env values above to RevClear/backend/.env"
Write-Host "2. Install dependencies: npm install (in backend folder)"
Write-Host "3. Run database schema: psql -h $DB_HOST -U $DB_USERNAME -d postgres"
Write-Host "4. Test API: npm run dev"
Write-Host ""
Write-Host "⚠️  DO NOT enable AI services (Transcribe/Comprehend) yet!"
Write-Host "    They cost ~$35-70/month. Test basic features first."
Write-Host ""
Write-Host "✓ Current setup costs: ~$8/month (FREE first year with RDS)"
Write-Host "============================================`n" -ForegroundColor Yellow
