# RevClear

Healthcare claims processing and transcription platform with AI-powered audio transcription.

##  Quick Start


 🔐 Authentication (Amazon Cognito)


### 👤 IAM Roles
Tenant Access


### 🗄️ Data Storage (DynamoDB)
- mental_health_patients
- physical_therapy_patients
- speech_therapy_patients

### 📦 File Storage (S3)
- `${S3_MAIN_BUCKET}` (tenant data)
- `${S3_LOGS_BUCKET}` (CloudTrail logs)
- `${S3_RAW_BUCKET}` (raw uploads)
- `${S3_EXPORTS_BUCKET}` (data exports)
- `${S3_AI_DATA_BUCKET}` (AI processing)

### 🔍 Audit Trail (CloudTrail)
- Trail: `${CLOUDTRAIL_NAME}`
- Logs: `${CLOUDTRAIL_LOG_BUCKET}/AWSLogs/${AWS_ACCOUNT_ID}`

### 🔒 Encryption (KMS)
- All DynamoDB tables encrypted
- All S3 buckets encrypted

## Environment Variables

Key variables:
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `API_GATEWAY_ID` - API Gateway endpoint ID
- `S3_MAIN_BUCKET` - Main S3 bucket name
- `COGNITO_USER_POOL_ID` - Cognito user pool ID

## Troubleshooting

**Lambda fails:** Check IAM role permissions  
**Transcribe errors:** Verify audio format (wav, mp3, flac)  
**Review UI not loading:** Update API_ENDPOINT in review.html

**Last Updated:** 2025-11-18
