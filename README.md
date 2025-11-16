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
- Embeddings: Titan Text
- Human review required after code generation

### 👥 Amazon A2I (Augmented AI)
Human-in-the-loop review at three checkpoints:
1. After speech-to-text transcription
2. After CPT/ICD code generation
3. After EDI claim draft

### 🎨 Frontend (CloudFront + S3)
React application with Vite
- Deployment: S3 static hosting + CloudFront CDN
- Auth: Cognito Hosted UI
- See: frontend/

---

## Repository Structure

```
revclear/
├── .env.example           Environment variables template
├── backend/
│   ├── lambdas/          Lambda function templates
│   └── api-gateway-config.json
├── frontend/
│   ├── src/config.js     Frontend configuration
│   └── package.json
├── terraform/            Infrastructure as code
├── docs/                 Documentation
└── Demo/                 Static demo site
```

---

## Quick Start

1. Copy environment variables
   ```bash
   cp .env.example .env
   ```

2. Review Lambda templates in backend/lambdas/

3. Review API Gateway configuration in backend/api-gateway-config.json

4. Review frontend configuration in frontend/src/config.js

---

## Documentation

- IMPLEMENTATION_PLAN.md - Step-by-step implementation guide
- docs/MULTITENANCY.md - Tenant isolation architecture
- docs/IAM_ROLES.md - Role policies and permissions
- docs/COGNITO_FLOW.md - Authentication flow
