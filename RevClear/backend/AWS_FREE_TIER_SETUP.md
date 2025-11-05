# AWS Free Tier Resources Setup

This guide helps you create all necessary AWS free tier resources for RevClear using GitHub Actions.

## 🎯 What Gets Created (All FREE)

1. **Cognito User Pool** - User authentication (50,000 MAUs free)
2. **S3 Buckets** - File storage (5GB free)
   - Storage bucket (encrypted, versioned)
   - Frontend bucket (static website hosting)
3. **RDS PostgreSQL** - Database (750 hours/month free, 20GB storage)
4. **Secrets Manager** - Secure credential storage
5. **CloudWatch Logs** - Application logging (5GB free)

**Total Monthly Cost: $0** (within free tier limits)

---

## 🚀 Quick Start

### Method 1: Run via GitHub Actions (RECOMMENDED)

1. **Go to Actions page:**
   ```
   https://github.com/hpppm/revclear/actions
   ```

2. **Select "Create AWS Resources" workflow**

3. **Click "Run workflow"**
   - Branch: `test-aws`
   - Action: `create`

4. **Click "Run workflow" button**

5. **Wait 5-10 minutes** (RDS creation takes time)

6. **Check the job output** for all resource IDs and endpoints

---

### Method 2: Run Locally (PowerShell)

```powershell
# Make sure you're in the project root
cd C:\Users\hppm1\OneDrive\Documents\GitHub\revclear

# Run the script using Git Bash or WSL
bash RevClear/backend/create-aws-resources.sh
```

Or in Git Bash:
```bash
cd RevClear/backend
chmod +x create-aws-resources.sh
./create-aws-resources.sh
```

---

## 📋 After Resources Are Created

### 1. Get Resource Information

**Run the "list" action** in GitHub Actions to see all resources:
- Workflow: "Create AWS Resources"
- Action: `list`

Or use AWS CLI:
```powershell
# List Cognito User Pools
aws cognito-idp list-user-pools --max-results 20

# List S3 Buckets
aws s3 ls

# List RDS Instances
aws rds describe-db-instances

# Get database credentials
aws secretsmanager get-secret-value --secret-id revclear/test/database --query SecretString --output text
```

### 2. Add New GitHub Secrets

The script will output GitHub secrets you need to add.

Go to: https://github.com/hpppm/revclear/settings/secrets/actions

**Add these secrets:**

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `AWS_USER_POOL_ID` | Cognito User Pool ID | From script output or `aws cognito-idp list-user-pools` |
| `AWS_S3_BUCKET` | Storage bucket name | `revclear-test-storage` |
| `AWS_S3_FRONTEND_BUCKET` | Frontend bucket name | `revclear-test-frontend` |
| `DB_SECRET_NAME` | Secrets Manager secret name | `revclear/test/database` |
| `AWS_LOG_GROUP` | CloudWatch log group | `/aws/revclear/test` |

### 3. Get Database Credentials

```powershell
# Get full database credentials
aws secretsmanager get-secret-value `
  --secret-id revclear/test/database `
  --query SecretString `
  --output text | ConvertFrom-Json | Format-List
```

This returns:
- Username
- Password
- Host (endpoint)
- Port
- Database name

---

## 🔧 Update Your Application

### Backend Configuration

Update `RevClear/backend/.env`:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_USER_POOL_ID=<from-output>
AWS_S3_BUCKET=revclear-test-storage

# Database (from Secrets Manager)
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=revclear_db
DB_USER=revclear_admin
DB_PASSWORD=<from-secrets-manager>

# Secrets Manager
DB_SECRET_NAME=revclear/test/database

# CloudWatch
AWS_LOG_GROUP=/aws/revclear/test
```

### Frontend Configuration

Update `RevClear/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=<from-output>
```

---

## 🗄️ Initialize Database

After RDS is created, run the schema:

```powershell
# Get database credentials
$secret = aws secretsmanager get-secret-value --secret-id revclear/test/database --query SecretString --output text | ConvertFrom-Json

# Connect using psql (install if needed)
$env:PGPASSWORD = $secret.password
psql -h $secret.host -U $secret.username -d $secret.dbname -f RevClear/backend/Documentation/db/002_cloud_db_schema.sql
```

Or use a database client like DBeaver, pgAdmin, or TablePlus.

---

## 📊 Verify Resources

### Check Everything is Working:

```powershell
# 1. Test Cognito
aws cognito-idp list-user-pools --max-results 1

# 2. Test S3
aws s3 ls s3://revclear-test-storage

# 3. Test RDS
aws rds describe-db-instances --db-instance-identifier revclear-test-db

# 4. Test Secrets Manager
aws secretsmanager get-secret-value --secret-id revclear/test/database

# 5. Test CloudWatch
aws logs describe-log-groups --log-group-name-prefix /aws/revclear/test
```

---

## 💰 Cost Monitoring

### Free Tier Limits:

| Service | Free Tier | Overage Cost |
|---------|-----------|--------------|
| Cognito | 50,000 MAUs | $0.0055/MAU |
| S3 | 5GB storage, 20k GET, 2k PUT | $0.023/GB |
| RDS | 750 hrs/month, 20GB | $0.017/hr after |
| Secrets Manager | $0.40/secret/month | (No free tier) |
| CloudWatch | 5GB logs | $0.50/GB |

**Expected Monthly Cost: ~$0.40** (just Secrets Manager)

### Set Up Budget Alert:

```powershell
# Run the budget setup script
cd RevClear/backend
.\aws-setup-budget.ps1
```

---

## 🔐 Security Features (HIPAA Compliant)

✅ **Encryption at rest** - All data encrypted  
✅ **Encryption in transit** - SSL/TLS required  
✅ **S3 versioning** - Track all changes  
✅ **Private buckets** - No public access  
✅ **Database backups** - 7-day retention  
✅ **Audit logs** - CloudWatch logging  

---

## 🆘 Troubleshooting

### Issue: "Rate exceeded" errors

**Solution:** Wait a few minutes and try again. AWS has rate limits.

### Issue: RDS creation takes too long

**Solution:** RDS typically takes 5-10 minutes. Be patient!

### Issue: "Secret already exists"

**Solution:** The script updates existing secrets. This is normal.

### Issue: Can't connect to database

**Solution:** 
1. Check security group allows your IP
2. Verify RDS is "available" status
3. Check credentials in Secrets Manager

---

## 🗑️ Clean Up Resources (if needed)

To delete all resources and stop charges:

```powershell
# Delete RDS (this takes time and cannot be undone!)
aws rds delete-db-instance --db-instance-identifier revclear-test-db --skip-final-snapshot

# Delete S3 buckets (must be empty first)
aws s3 rb s3://revclear-test-storage --force
aws s3 rb s3://revclear-test-frontend --force

# Delete Cognito User Pool
aws cognito-idp delete-user-pool --user-pool-id <your-pool-id>

# Delete Secrets
aws secretsmanager delete-secret --secret-id revclear/test/database --force-delete-without-recovery

# Delete CloudWatch Log Group
aws logs delete-log-group --log-group-name /aws/revclear/test
```

---

## 📚 Next Steps

1. ✅ Create resources using GitHub Actions
2. ✅ Add GitHub Secrets
3. ✅ Initialize database schema
4. ✅ Update application configuration
5. ✅ Test database connection
6. ✅ Deploy backend to AWS
7. ✅ Deploy frontend to S3

---

## 🔗 Useful Links

- [AWS Free Tier](https://aws.amazon.com/free/)
- [GitHub Secrets](https://github.com/hpppm/revclear/settings/secrets/actions)
- [GitHub Actions](https://github.com/hpppm/revclear/actions)
- [AWS Console](https://console.aws.amazon.com/)

---

**Ready to create your AWS resources? Go to the Actions page and run the workflow!** 🚀
