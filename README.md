# RevClear

Healthcare claims processing and transcription platform with AI-powered audio transcription.

##  Quick Start

**Account**: See `.env` | **Region**: See `.env`

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

**Last Updated:** 2025-11-18
