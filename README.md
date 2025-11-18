# RevClear

Healthcare claims processing and transcription platform with AI-powered audio transcription.

## 🚀 Quick Start

Your infrastructure is **already deployed** and ready to test!

**Account**: See `.env` | **Region**: See `.env`

### Test in 2 Minutes

```bash
# 1. Upload test audio
aws s3 cp /mnt/c/Dev/test_audio.wav s3://arevclear/test/audio/test.wav

# 2. Test Lambda
aws lambda invoke --function-name kr --payload file://s3-event.json output.json

# 3. Check logs
aws logs tail /aws/lambda/processAudioLambda --since 10m
```

📖 **Full guide**: See [`SETUP_AND_TEST.md`](./SETUP_AND_TEST.md)

## 📁 Key Files

- **[SETUP_AND_TEST.md](./SETUP_AND_TEST.md)** - Start here! Quick testing guide
- **[TEST_GUIDE.md](./TEST_GUIDE.md)** - Detailed testing instructions with all your resource names
- **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Complete project overview
- **[cleanup.sh](./cleanup.sh)** - Clean build artifacts

**AWS Account**: See `.env` | **Region**: See `.env`

---

## Deployed Services

### 🔐 Authentication (Amazon Cognito)
- User Pool ID: `${COGNITO_USER_POOL_ID}`
- App Client ID: `${COGNITO_APP_CLIENT_ID}`
- Identity Pool ID: `${COGNITO_IDENTITY_POOL_ID}`
- Groups: Clinic_A, Clinic_B, Clinic_C
- Users: Configured in Cognito (see `.env`)

### 👤 IAM Roles
Tenant Access:
- ClinicARole: `${ROLE_CLINIC_A}`
- ClinicBRole: `${ROLE_CLINIC_B}`
- ClinicCRole: `${ROLE_CLINIC_C}`

Lambda Execution:
- RevClearAIProcessingRole: `${ROLE_LAMBDA_PROCESSING}`

### 🗄️ Data Storage (DynamoDB)
- mental_health_patients
- physical_therapy_patients
- speech_therapy_patients

### 📦 File Storage (S3)
- `${S3_MAIN_BUCKET}` (tenant data)
- `${S3_LOGS_BUCKET}` (CloudTrail logs)
- `${S3_RAW_BUCKET}` (raw uploads)
- `${S3_EXPORTS_BUCKET}` (data exports)
- `${S3_AI_DATA_BUCKET}` (AI processing, lifecycle: 90d→DEEP_ARCHIVE, 730d expiration)

### 🔍 Audit Trail (CloudTrail)
- Trail: `${CLOUDTRAIL_NAME}`
- Logs: `${CLOUDTRAIL_LOG_BUCKET}/AWSLogs/${AWS_ACCOUNT_ID}`

### 🔒 Encryption (KMS)
- All DynamoDB tables encrypted
- All S3 buckets encrypted


---

## Planned Services

### 🌐 API Gateway
REST API with Cognito JWT authentication
- Endpoints: /patients, /encounters, /claims, /ai/*
- Security: Cognito User Pool Authorizer
- See: backend/api-gateway-config.json

### ⚡ Lambda Functions
One Lambda per API endpoint
- getPatients, createEncounter, submitClaim
- transcribeAudio, generateSummary, generateCPTcodes
- generateEDI, processWithBedrock
- See: backend/lambdas/

### 🎤 AWS Transcribe Medical
Speech-to-text for clinical encounters
- Human review required after transcription

### 🤖 Amazon Bedrock
AI-powered clinical coding and summaries
- Model: Claude 3 Sonnet
---

## Quick Deploy (3 Steps)

### 1. Install Dependencies
```bash
cd backend/lambdas
npm install
```

### 2. Deploy Lambda Functions
```bash
# Package
zip -r transcribeAudioSimple.zip transcribeAudioSimple.js node_modules/
zip -r generateCodesSimple.zip generateCodesSimple.js node_modules/

# Deploy
# Load environment variables first
source .env

aws lambda create-function \
  --function-name transcribeAudioSimple \
  --runtime nodejs18.x \
  --role $LAMBDA_ROLE_ARN \
  --handler transcribeAudioSimple.handler \
  --zip-file fileb://transcribeAudioSimple.zip \
  --timeout 60 \
  --memory-size 512

aws lambda create-function \
  --function-name generateCodesSimple \
  --runtime nodejs18.x \
  --role $LAMBDA_ROLE_ARN \
  --handler generateCodesSimple.handler \
  --zip-file fileb://generateCodesSimple.zip \
  --timeout 90 \
  --memory-size 1024
```

### 3. Upload Review UI
```bash
aws s3 cp frontend/review.html s3://arevclear/review.html --acl public-read
```

**Done!** Access at: `${FRONTEND_URL}`

---

## Project Structure

```
revclear/
├── backend/lambdas/
│   ├── processAudioLambda.js         ✅ Deployed
│   ├── transcribeAudioSimple.js      ⏳ To deploy
│   ├── generateCodesSimple.js        ⏳ To deploy
│   └── package.json
├── frontend/
│   └── review.html                   ⏳ Clinician dashboard
├── terraform/                         📁 Infrastructure as code
└── .env                               🔑 All your AWS IDs (NEVER commit!)
```

---

## How It Works

### Workflow
```
Audio Upload (S3)
   ↓
processAudioLambda (triggers transcription)
   ↓
Transcribe Medical (speech-to-text)
   ↓
generateCodesSimple (Bedrock AI)
   ↓
DynamoDB (status: PENDING_REVIEW)
   ↓
review.html (clinician approves)
   ↓
Ready for billing
```

### Specialties
- Mental Health (`mental_health_patients`)
- Physical Therapy (`physical_therapy_patients`)
- Speech Therapy (`speech_therapy_patients`)

---

## Common Commands

### Check Deployment
```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[*].[FunctionName,Runtime]' --output table

# Check S3 buckets
aws s3 ls

# View DynamoDB tables
aws dynamodb list-tables

# Run full audit
bash audit_revclear.sh
```

### Update Lambda
```bash
cd backend/lambdas
zip -r function.zip index.js node_modules/
aws lambda update-function-code \
  --function-name FUNCTION_NAME \
  --zip-file fileb://function.zip
```

### View Logs
```bash
aws logs tail /aws/lambda/transcribeAudioSimple --follow
```

---

## Environment Variables

All AWS credentials are stored in `.env` (excluded from git).

Key variables:
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `API_GATEWAY_ID` - API Gateway endpoint ID
- `S3_MAIN_BUCKET` - Main S3 bucket name
- `COGNITO_USER_POOL_ID` - Cognito user pool ID

See `.env.example` for a complete list of required variables.

---

## Troubleshooting

**Lambda fails:** Check IAM role permissions  
**Transcribe errors:** Verify audio format (wav, mp3, flac)  
**DynamoDB errors:** Check table names match specialty  
**Review UI not loading:** Update API_ENDPOINT in review.html

---

## Cost Estimate

**For 15 patients/month:**
- Lambda: $0.20
- Transcribe: $7.50 (100 min)
- Bedrock: $0.30
- DynamoDB: $1.00
- S3: $0.50
- **Total: ~$10/month** ✅

---

## Security

- ✅ HIPAA compliant
- ✅ Encryption at rest (S3, DynamoDB)
- ✅ Encryption in transit (TLS 1.2+)
- ✅ Cognito authentication
- ✅ IAM least privilege

---

## Support

- 📧 AWS Resources: See `.env`
- 📝 Audit Script: `bash audit_revclear.sh`
- 🔧 Operations Guide: (this file)

## Important Security Notes

⚠️ **Never commit `.env` or `.env.production` to git**
- All AWS credentials are in `.env` (gitignored)
- Use `.env.example` as a template for setup
- This repo is safe to share with professors

**Last Updated:** 2025-11-18
