# AWS Dependencies to Install

Run this command in the RevClear/backend directory to install AWS SDK packages:

```bash
npm install @aws-sdk/client-rds-data @aws-sdk/client-secrets-manager @aws-sdk/client-cognito-identity-provider @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-cloudwatch-logs jwks-rsa jsonwebtoken
```

```bash
npm install --save-dev @types/jsonwebtoken
```

## Required AWS SDK Packages:

- **@aws-sdk/client-rds-data** - RDS database operations
- **@aws-sdk/client-secrets-manager** - Secure credential storage
- **@aws-sdk/client-cognito-identity-provider** - User authentication
- **@aws-sdk/client-s3** - File storage operations
- **@aws-sdk/s3-request-presigner** - Generate pre-signed URLs
- **@aws-sdk/client-cloudwatch-logs** - Application logging
- **jwks-rsa** - JWT token verification
- **jsonwebtoken** - JWT handling

## Environment Variables Required:

Create `.env` file in `RevClear/backend/`:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Database (RDS)
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=revclear_db
DB_USER=revclear_admin
DB_PASSWORD=your_password

# Cognito
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_CLIENT_ID=your_client_id

# S3
AWS_S3_BUCKET=revclear-storage-production

# Secrets Manager
AWS_SECRET_NAME=revclear/database/credentials

# CloudWatch
AWS_LOG_GROUP=/aws/revclear/production
```
