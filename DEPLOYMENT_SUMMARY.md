# Deployment Summary

Complete details of deployed AWS infrastructure

**AWS Account**: 414669980881  
**Region**: us-east-1  
**Cost**: $35/month

---

## 🔐 Authentication (Amazon Cognito)

### User Pool
- Name: ClinicUserPoolSimple
- ID: us-east-1_NZCFuSv1l
- Region: us-east-1

### App Client
- ID: 5g5qvrvd04h9suejmlie2rjncd
- Type: Public client (for frontend)

### Identity Pool
- Name: ClinicIdentityPool
- ID: us-east-1:1d234050-e204-4a70-b4af-5930556b6957

### Groups
- Clinic_A (maps to ClinicARole)
- Clinic_B (maps to ClinicBRole)
- Clinic_C (maps to ClinicCRole)

### Users
- clinicianA@example.com (Group: Clinic_A)
- clinicianB@example.com (Group: Clinic_B)
- clinicianC@example.com (Group: Clinic_C)
- Status: All users require password reset on first login

---

## 👤 IAM Roles

### ClinicARole
- ARN: arn:aws:iam::414669980881:role/ClinicARole
- DynamoDB: mental_health_patients (read/write)
- S3: arevclear/clinicA/* (read/write)
- Specialty: mental_health
- Tags: HIPAA=enabled, Environment=prod, Tenant=A

### ClinicBRole
- ARN: arn:aws:iam::414669980881:role/ClinicBRole
- DynamoDB: physical_therapy_patients (read/write)
- S3: arevclear/clinicB/* (read/write)
- Specialty: physical_therapy
- Tags: HIPAA=enabled, Environment=prod, Tenant=B

### ClinicCRole
- ARN: arn:aws:iam::414669980881:role/ClinicCRole
- DynamoDB: speech_therapy_patients (read/write)
- S3: arevclear/clinicC/* (read/write)
- Specialty: speech_therapy
- Tags: HIPAA=enabled, Environment=prod, Tenant=C

### RevClearAIProcessingRole (Lambda Execution)
- ARN: arn:aws:iam::414669980881:role/RevClearAIProcessingRole
- Purpose: Lambda function execution for AI processing
- Permissions:
  - S3: GetObject, PutObject on revclear-ai-data-*/*
  - CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents
- Used by: transcribeAudio, generateSummary, generateCPTcodes, processWithBedrock Lambdas

---

## 🗄️ DynamoDB Tables

### mental_health_patients
- Clinic: A
- Partition Key: patientId (String)
- Encryption: KMS

### physical_therapy_patients
- Clinic: B
- Partition Key: patientId (String)
- Encryption: KMS

### speech_therapy_patients
- Clinic: C
- Partition Key: patientId (String)
- Encryption: KMS

---

## 📦 S3 Buckets

### arevclear (Main)
- Usage: Patient data, encounters, claims, AI processing
- Encryption: AES-256
- Versioning: Disabled
- Prefixes:
  - clinicA/ (Clinic A data)
  - clinicB/ (Clinic B data)
  - clinicC/ (Clinic C data)
  - ai/ (AI processing files)

### arevclear-logs
- Usage: CloudTrail logs
- Path: AWSLogs/414669980881/
- Retention: Indefinite

### arevclear-raw
- Usage: Raw file uploads
- Status: Created but not actively used

### arevclear-exports
- Usage: Data exports
- Status: Created but not actively used

### revclear-ai-data-414669980881
- Usage: AI processing (transcripts, summaries, embeddings)
- Encryption: KMS
- Public Access: Blocked
- Lifecycle: 90 days → DEEP_ARCHIVE, 730 days → Expire
- Tags: Project=RevClear, Environment=Prod, Compliance=HIPAA, DataType=AI/PHI, Owner=SecurityTeam

---

## 🔍 CloudTrail

### RevClearTrail
- Status: Active
- Log Location: arevclear-logs/AWSLogs/414669980881/
- Events Tracked:
  - S3 object operations
  - DynamoDB table operations
  - IAM role assumptions
  - Cognito authentication events
- Multi-region: No
- Organization trail: No

---

## 🔒 Encryption

### KMS
- DynamoDB: All tables encrypted with AWS managed keys
- S3: All buckets encrypted with AES-256
- CloudTrail: Logs encrypted in S3

---

## 🔄 Authentication Flow

1. User visits frontend URL
2. Frontend redirects to Cognito Hosted UI
3. User enters email and password
4. Cognito authenticates and assigns to group (Clinic_A, Clinic_B, or Clinic_C)
5. Identity Pool exchanges Cognito token for temporary AWS credentials
6. IAM role mapped based on group membership
7. Frontend receives JWT token
8. All API requests include JWT in Authorization header
9. Backend Lambda verifies JWT and extracts tenant
10. Lambda uses tenant-specific IAM role for DynamoDB and S3 access

---

## 🛡️ Security Features

- Tenant isolation via IAM policies
- JWT verification on every API request
- Encryption at rest (KMS for DynamoDB, AES-256 for S3)
- Encryption in transit (HTTPS only)
- CloudTrail audit logging of all actions
- HIPAA compliance tags on all resources
- No cross-tenant data access possible

---

## 📊 Cost Breakdown

Monthly costs (current infrastructure):

| Service | Cost | Details |
|---------|------|---------|
| Cognito | $5 | 3 users, minimal authentication volume |
| DynamoDB | $10 | 3 tables, on-demand pricing |
| S3 | $5 | 4 buckets, minimal storage |
| KMS | $1 | Encryption keys |
| CloudTrail | $10 | Event logging |
| IAM | $0 | Free |
| **Total** | **$35/month** | |

---

## 📝 Notes

- All infrastructure created manually via AWS Console
- Terraform files exist in terraform/ folder for reference
- No infrastructure currently managed by Terraform (manual only)
- Application code exists as templates only (not deployed)
- API Gateway and Lambda functions need to be created
- Bedrock and Transcribe Medical need to be enabled
- Frontend needs to be built and deployed to S3 + CloudFront

---

## 🚀 Next Steps

1. Enable AWS Transcribe Medical
2. Enable Amazon Bedrock (request model access)
3. Create API Gateway REST API
4. Deploy Lambda functions
5. Setup Amazon A2I workflows
6. Build and deploy frontend
7. Test end-to-end workflow

See IMPLEMENTATION_PLAN.md for detailed instructions.
