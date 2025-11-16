# RevClear

HIPAA-compliant multi-tenant healthcare claims processing system

**AWS Account**: 414669980881 | **Region**: us-east-1

---

## Deployed Services

### 🔐 Authentication (Amazon Cognito)
- User Pool ID: us-east-1_NZCFuSv1l
- App Client ID: 5g5qvrvd04h9suejmlie2rjncd
- Identity Pool ID: us-east-1:1d234050-e204-4a70-b4af-5930556b6957
- Groups: Clinic_A, Clinic_B, Clinic_C
- Users: clinicianA@example.com, clinicianB@example.com, clinicianC@example.com

### 👤 IAM Roles
Tenant Access:
- ClinicARole: arn:aws:iam::414669980881:role/ClinicARole
- ClinicBRole: arn:aws:iam::414669980881:role/ClinicBRole
- ClinicCRole: arn:aws:iam::414669980881:role/ClinicCRole

Lambda Execution:
- RevClearAIProcessingRole: arn:aws:iam::414669980881:role/RevClearAIProcessingRole

### 🗄️ Data Storage (DynamoDB)
- mental_health_patients
- physical_therapy_patients
- speech_therapy_patients

### 📦 File Storage (S3)
- arevclear (tenant data)
- arevclear-logs (CloudTrail logs)
- arevclear-raw (raw uploads)
- arevclear-exports (data exports)
- revclear-ai-data-414669980881 (AI processing, lifecycle: 90d→DEEP_ARCHIVE, 730d expiration)

### 🔍 Audit Trail (CloudTrail)
- Trail: RevClearTrail
- Logs: arevclear-logs/AWSLogs/414669980881

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
aws lambda create-function \
  --function-name transcribeAudioSimple \
  --runtime nodejs18.x \
  --role arn:aws:iam::414669980881:role/LambdaRevclearRole \
  --handler transcribeAudioSimple.handler \
  --zip-file fileb://transcribeAudioSimple.zip \
  --timeout 60 \
  --memory-size 512

aws lambda create-function \
  --function-name generateCodesSimple \
  --runtime nodejs18.x \
  --role arn:aws:iam::414669980881:role/LambdaRevclearRole \
  --handler generateCodesSimple.handler \
  --zip-file fileb://generateCodesSimple.zip \
  --timeout 90 \
  --memory-size 1024
```

### 3. Upload Review UI
```bash
aws s3 cp frontend/review.html s3://arevclear/review.html --acl public-read
```

**Done!** Access at: https://arevclear.s3.amazonaws.com/review.html

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
├── terraform/                         📁 Optional (for future scaling)
└── .env.production                    🔑 All your AWS IDs
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

See `.env.production` for all AWS resource IDs.

Key variables:
- `AWS_ACCOUNT_ID=414669980881`
- `API_GATEWAY_ID=5ryzn2juw7`
- `S3_MAIN_BUCKET=arevclear`
- `COGNITO_USER_POOL_ID=us-east-1_NZCFuSv1l`

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

- 📧 AWS Resources: See `.env.production`
- 📝 Audit Script: `bash audit_revclear.sh`
- 🔧 Operations Guide: (this file)

**Last Updated:** 2025-11-16
