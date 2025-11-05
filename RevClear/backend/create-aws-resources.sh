#!/bin/bash
# AWS Free Tier Services Setup Script for RevClear
# Run this script to create all necessary AWS resources

set -e  # Exit on error

echo "🚀 Creating AWS Free Tier Services for RevClear..."
echo ""

# Configuration
PROJECT_NAME="revclear"
ENVIRONMENT="test"
REGION="${AWS_REGION:-us-east-1}"

echo "📋 Configuration:"
echo "   Project: $PROJECT_NAME"
echo "   Environment: $ENVIRONMENT"
echo "   Region: $REGION"
echo ""

# ============================================
# 1. CREATE COGNITO USER POOL (FREE)
# ============================================
echo "👥 Creating Cognito User Pool..."

USER_POOL_NAME="${PROJECT_NAME}-${ENVIRONMENT}-users"

# Check if user pool already exists
EXISTING_POOL=$(aws cognito-idp list-user-pools --max-results 50 --query "UserPools[?Name=='$USER_POOL_NAME'].Id" --output text)

if [ -z "$EXISTING_POOL" ]; then
    echo "   Creating new user pool: $USER_POOL_NAME"
    
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name "$USER_POOL_NAME" \
        --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
        --auto-verified-attributes email \
        --username-attributes email \
        --mfa-configuration OFF \
        --account-recovery-setting "RecoveryMechanisms=[{Priority=1,Name=verified_email}]" \
        --tags "Project=$PROJECT_NAME,Environment=$ENVIRONMENT" \
        --query 'UserPool.Id' \
        --output text)
    
    echo "   ✅ User Pool created: $USER_POOL_ID"
    
    # Create App Client
    echo "   Creating app client..."
    CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --user-pool-id "$USER_POOL_ID" \
        --client-name "${PROJECT_NAME}-${ENVIRONMENT}-client" \
        --generate-secret \
        --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
        --query 'UserPoolClient.ClientId' \
        --output text)
    
    echo "   ✅ App Client created: $CLIENT_ID"
else
    USER_POOL_ID="$EXISTING_POOL"
    echo "   ℹ️  User pool already exists: $USER_POOL_ID"
fi

echo ""

# ============================================
# 2. CREATE S3 BUCKETS (FREE 5GB)
# ============================================
echo "📦 Creating S3 Buckets..."

BUCKET_STORAGE="${PROJECT_NAME}-${ENVIRONMENT}-storage"
BUCKET_FRONTEND="${PROJECT_NAME}-${ENVIRONMENT}-frontend"

# Storage bucket for documents/files
if aws s3 ls "s3://$BUCKET_STORAGE" 2>/dev/null; then
    echo "   ℹ️  Storage bucket already exists: $BUCKET_STORAGE"
else
    echo "   Creating storage bucket: $BUCKET_STORAGE"
    aws s3 mb "s3://$BUCKET_STORAGE" --region "$REGION"
    
    # Enable versioning for HIPAA compliance
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_STORAGE" \
        --versioning-configuration Status=Enabled
    
    # Block public access (HIPAA requirement)
    aws s3api put-public-access-block \
        --bucket "$BUCKET_STORAGE" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_STORAGE" \
        --server-side-encryption-configuration \
        '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
    
    echo "   ✅ Storage bucket created with encryption: $BUCKET_STORAGE"
fi

# Frontend bucket (optional - for static hosting)
if aws s3 ls "s3://$BUCKET_FRONTEND" 2>/dev/null; then
    echo "   ℹ️  Frontend bucket already exists: $BUCKET_FRONTEND"
else
    echo "   Creating frontend bucket: $BUCKET_FRONTEND"
    aws s3 mb "s3://$BUCKET_FRONTEND" --region "$REGION"
    
    # This bucket can be public for frontend hosting
    aws s3 website "s3://$BUCKET_FRONTEND" \
        --index-document index.html \
        --error-document error.html
    
    echo "   ✅ Frontend bucket created: $BUCKET_FRONTEND"
fi

echo ""

# ============================================
# 3. CREATE RDS POSTGRESQL (FREE TIER)
# ============================================
echo "🗄️  Creating RDS PostgreSQL Database..."

DB_INSTANCE_ID="${PROJECT_NAME}-${ENVIRONMENT}-db"
DB_NAME="${PROJECT_NAME}_db"
DB_USERNAME="revclear_admin"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Check if DB instance exists
DB_EXISTS=$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" 2>/dev/null || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "   Creating PostgreSQL database: $DB_INSTANCE_ID"
    echo "   ⚠️  This will take 5-10 minutes..."
    
    # Create DB instance (free tier: db.t3.micro or db.t4g.micro)
    aws rds create-db-instance \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.4 \
        --master-username "$DB_USERNAME" \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --storage-type gp2 \
        --storage-encrypted \
        --backup-retention-period 7 \
        --preferred-backup-window "03:00-04:00" \
        --preferred-maintenance-window "mon:04:00-mon:05:00" \
        --db-name "$DB_NAME" \
        --publicly-accessible \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT" \
        --no-multi-az \
        --no-enable-performance-insights
    
    echo "   ⏳ Waiting for database to be available..."
    aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID"
    
    echo "   ✅ Database created: $DB_INSTANCE_ID"
else
    echo "   ℹ️  Database already exists: $DB_INSTANCE_ID"
    # Get existing password from secrets manager if it exists
    DB_PASSWORD="<retrieve-from-secrets-manager>"
fi

# Get DB endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text 2>/dev/null || echo "creating...")

echo "   Database endpoint: $DB_ENDPOINT"
echo ""

# ============================================
# 4. CREATE SECRETS MANAGER SECRETS
# ============================================
echo "🔐 Creating Secrets Manager Secrets..."

SECRET_NAME="${PROJECT_NAME}/${ENVIRONMENT}/database"

# Check if secret exists
SECRET_EXISTS=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" 2>/dev/null || echo "")

if [ -z "$SECRET_EXISTS" ]; then
    echo "   Creating database credentials secret..."
    
    SECRET_STRING=$(cat <<EOF
{
  "username": "$DB_USERNAME",
  "password": "$DB_PASSWORD",
  "engine": "postgres",
  "host": "$DB_ENDPOINT",
  "port": 5432,
  "dbname": "$DB_NAME"
}
EOF
)
    
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "RevClear database credentials for $ENVIRONMENT" \
        --secret-string "$SECRET_STRING" \
        --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"
    
    echo "   ✅ Secret created: $SECRET_NAME"
else
    echo "   ℹ️  Secret already exists: $SECRET_NAME"
    
    # Update the secret with new values if needed
    SECRET_STRING=$(cat <<EOF
{
  "username": "$DB_USERNAME",
  "password": "$DB_PASSWORD",
  "engine": "postgres",
  "host": "$DB_ENDPOINT",
  "port": 5432,
  "dbname": "$DB_NAME"
}
EOF
)
    
    aws secretsmanager update-secret \
        --secret-id "$SECRET_NAME" \
        --secret-string "$SECRET_STRING"
    
    echo "   ✅ Secret updated: $SECRET_NAME"
fi

echo ""

# ============================================
# 5. CREATE CLOUDWATCH LOG GROUP (FREE)
# ============================================
echo "📊 Creating CloudWatch Log Group..."

LOG_GROUP="/aws/${PROJECT_NAME}/${ENVIRONMENT}"

if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --query "logGroups[?logGroupName=='$LOG_GROUP']" --output text | grep -q "$LOG_GROUP"; then
    echo "   ℹ️  Log group already exists: $LOG_GROUP"
else
    echo "   Creating log group: $LOG_GROUP"
    
    aws logs create-log-group --log-group-name "$LOG_GROUP"
    
    # Set retention to 7 days (free tier)
    aws logs put-retention-policy \
        --log-group-name "$LOG_GROUP" \
        --retention-in-days 7
    
    echo "   ✅ Log group created: $LOG_GROUP"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "✅ AWS Resources Created Successfully!"
echo "=========================================="
echo ""
echo "📋 Resource Summary:"
echo ""
echo "1. Cognito User Pool:"
echo "   Pool ID: $USER_POOL_ID"
echo "   Region: $REGION"
echo ""
echo "2. S3 Buckets:"
echo "   Storage: s3://$BUCKET_STORAGE"
echo "   Frontend: s3://$BUCKET_FRONTEND"
echo ""
echo "3. RDS PostgreSQL:"
echo "   Instance: $DB_INSTANCE_ID"
echo "   Endpoint: $DB_ENDPOINT"
echo "   Database: $DB_NAME"
echo "   Username: $DB_USERNAME"
echo ""
echo "4. Secrets Manager:"
echo "   Secret: $SECRET_NAME"
echo ""
echo "5. CloudWatch Logs:"
echo "   Log Group: $LOG_GROUP"
echo ""
echo "=========================================="
echo "🔐 GitHub Secrets to Add:"
echo "=========================================="
echo ""
echo "Add these to: https://github.com/hpppm/revclear/settings/secrets/actions"
echo ""
echo "AWS_USER_POOL_ID=$USER_POOL_ID"
echo "AWS_S3_BUCKET=$BUCKET_STORAGE"
echo "AWS_S3_FRONTEND_BUCKET=$BUCKET_FRONTEND"
echo "DB_SECRET_NAME=$SECRET_NAME"
echo "AWS_LOG_GROUP=$LOG_GROUP"
echo ""
echo "Database credentials are stored in AWS Secrets Manager: $SECRET_NAME"
echo ""
echo "=========================================="
echo "💰 Cost Estimate: FREE (within free tier)"
echo "=========================================="
echo ""
echo "✅ All resources are configured for free tier usage!"
echo "✅ HIPAA compliance features enabled (encryption, versioning)"
echo ""
