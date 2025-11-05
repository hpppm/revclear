# RevClear AWS Complete Guide
**Everything Your Team Needs in One File**

Last Updated: November 5, 2025 | Branch: aws-migration

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [All 18 AWS Services](#all-18-aws-services)
3. [API Routes & Endpoints](#api-routes--endpoints)
4. [Service Architecture](#service-architecture)
5. [Setup Commands](#setup-commands)
6. [Cost Breakdown](#cost-breakdown)
7. [Complete Scenario Example](#complete-scenario-example)

---

## 🎯 Overview

RevClear is a HIPAA-compliant medical billing system with AI capabilities. This guide covers all AWS services, their relationships, APIs, and how everything works together.

**What RevClear Does:**
- Clinicians record patient encounters (audio)
- AI converts audio to text
- AI generates SOAP notes
- AI extracts ICD-10/CPT codes
- System creates insurance claims
- Clinicians submit claims

**Total Files Created:** 6 AWS documentation files (now merged into this one)

---

## 📦 All 18 AWS Services

### ✅ Core Services (6) - Already Configured

| # | Service | Purpose | Monthly Cost | Priority |
|---|---------|---------|--------------|----------|
| 1 | **RDS PostgreSQL** | Main database for patients, encounters, claims | ~$15 | 🔴 Critical |
| 2 | **S3** | Store audio files & documents (PHI) | ~$0.50 | 🔴 Critical |
| 3 | **Cognito** | User authentication (clinicians/admin) | Free | 🔴 Critical |
| 4 | **CloudWatch** | Application logging & monitoring | ~$5 | 🟡 High |
| 5 | **Secrets Manager** | Store database passwords securely | ~$0.50 | 🔴 Critical |
| 6 | **ECR** | Docker container registry | ~$1 | 🟡 High |

**Core Subtotal: ~$22/month**

---

### 🆕 Additional Services (12) - Recommended

| # | Service | Purpose | Monthly Cost | Priority |
|---|---------|---------|--------------|----------|
| 7 | **Lambda** | Serverless AI processing functions | ~$2 | 🔴 Critical |
| 8 | **SQS** | Message queue for async processing | ~$0.50 | 🔴 Critical |
| 9 | **SNS** | Email/SMS notifications | ~$2 | 🟡 High |
| 10 | **KMS** | Encryption key management (HIPAA) | ~$1 | 🔴 Critical |
| 11 | **EventBridge** | Event-driven automation | Free | 🟡 High |
| 12 | **CloudTrail** | Audit logging (HIPAA required) | ~$2 | 🔴 Critical |
| 13 | **AWS Backup** | Automated backups (7-year retention) | ~$5 | 🟡 High |
| 14 | **Transcribe Medical** | Speech-to-text for medical audio | ~$25 | 🔴 Critical |
| 15 | **Comprehend Medical** | Extract medical entities from text | ~$10 | 🟢 Medium |
| 16 | **WAF** | Web application firewall | ~$5 | 🟡 High |
| 17 | **API Gateway** | Managed API endpoint | ~$3.50 | 🟢 Medium |
| 18 | **Systems Manager** | Configuration storage | Free | ⚪ Low |

**Additional Subtotal: ~$56/month**

---

## 💰 Total Monthly Cost: ~$78

*(Based on small practice: 100 patients, 500 encounters/month)*

---

## 🌐 API Routes & Endpoints

**Base URL:** `https://api.revclear.com/api`  
**Authentication:** All routes require JWT token from Cognito (except login/register)

### 1. Authentication Routes

**Base:** `/api/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/register` | Register new clinician | ❌ |
| `POST` | `/login` | Login with email/password | ❌ |
| `GET` | `/me` | Get current user info | ✅ |
| `POST` | `/logout` | Logout current session | ✅ |

**Example - Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "dr.smith@clinic.com",
  "password": "SecurePass123!"
}

Response:
{
  "token": "eyJhbGciOi...",
  "user": {
    "uid": "abc-123",
    "email": "dr.smith@clinic.com",
    "role": "clinician"
  }
}
```

---

### 2. Patient Routes

**Base:** `/api/patients`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | List all patients for clinician | ✅ |
| `POST` | `/` | Create new patient | ✅ |
| `GET` | `/:patientId` | Get patient details | ✅ |
| `PUT` | `/:patientId` | Update patient info | ✅ |
| `DELETE` | `/:patientId` | Delete patient | ✅ |

**Example - Create Patient:**
```bash
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Smith",
  "dob": "1985-03-22",
  "gender": "male",
  "phone": "+1-555-123-4567",
  "email": "john.smith@email.com",
  "insurance_provider": "Blue Cross Blue Shield",
  "insurance_policy_number": "BCBS-908273"
}

Response:
{
  "id": "patient-uuid-123",
  "message": "Patient created successfully"
}
```

---

### 3. Encounter Routes

**Base:** `/api/encounters`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/` | Create new encounter | ✅ |
| `GET` | `/` | List encounters for clinician | ✅ |
| `GET` | `/:encounterId` | Get encounter details | ✅ |
| `PUT` | `/:encounterId` | Update SOAP notes | ✅ |
| `DELETE` | `/:encounterId` | Delete encounter | ✅ |
| `POST` | `/:encounterId/audio` | Upload audio file | ✅ |
| `GET` | `/:encounterId/ai-results` | Get AI-generated results | ✅ |

**Example - Start Encounter:**
```bash
POST /api/encounters
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "patient-uuid-123",
  "date_of_service": "2025-11-05T14:00:00Z"
}

Response:
{
  "encounter_id": "encounter-uuid-456",
  "status": "draft",
  "message": "Encounter started"
}
```

**Example - Upload Audio:**
```bash
POST /api/encounters/encounter-uuid-456/audio
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <audio-file.mp3>

Response:
{
  "audio_url": "s3://revclear-storage/audio/encounter-uuid-456.mp3",
  "status": "processing",
  "message": "Audio uploaded, transcription in progress"
}
```

---

### 4. AI Processing Routes

**Base:** `/api/ai`

| Method | Endpoint | Description | Triggers |
|--------|----------|-------------|----------|
| `POST` | `/transcribe` | Convert audio to text | Lambda → Transcribe Medical |
| `POST` | `/generate-soap` | Generate SOAP from transcript | Lambda → Comprehend Medical |
| `POST` | `/extract-codes` | Extract ICD-10/CPT codes | Lambda → Comprehend Medical |
| `POST` | `/generate-claim` | Create claim from codes | Lambda |
| `POST` | `/analyze-feedback` | Analyze claim feedback | Lambda |

**Example - Generate SOAP:**
```bash
POST /api/ai/generate-soap
Authorization: Bearer <token>
Content-Type: application/json

{
  "encounter_id": "encounter-uuid-456",
  "transcript": "Patient reports mild cough and fatigue for three days. No fever. Lungs clear on auscultation. Vital signs stable."
}

Response:
{
  "soap": {
    "subjective": "Patient reports mild cough and fatigue for 3 days",
    "objective": "Vitals stable. Lungs clear. No fever.",
    "assessment": "Upper respiratory infection, likely viral",
    "plan": "Rest, fluids, OTC cough medication. Follow up if worsens."
  },
  "confidence": 0.94,
  "codes_suggested": {
    "icd10": ["J06.9"],
    "cpt": ["99213"]
  }
}
```

---

### 5. Claims Routes

**Base:** `/api/claims`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | List all claims | ✅ |
| `POST` | `/` | Create new claim | ✅ |
| `GET` | `/:claimId` | Get claim details | ✅ |
| `PUT` | `/:claimId/submit` | Submit claim to insurance | ✅ |
| `PUT` | `/:claimId/status` | Update claim status | ✅ |

**Example - Create Claim:**
```bash
POST /api/claims
Authorization: Bearer <token>
Content-Type: application/json

{
  "encounter_id": "encounter-uuid-456",
  "patient_id": "patient-uuid-123",
  "diagnosis_codes": ["J06.9"],
  "procedure_codes": ["99213"],
  "total_amount": 120.00,
  "insurance_provider": "Blue Cross Blue Shield"
}

Response:
{
  "claim_id": "claim-uuid-789",
  "status": "ready",
  "message": "Claim created successfully"
}
```

---

### 6. Notification Routes

**Base:** `/api/notifications`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Get all notifications | ✅ |
| `PUT` | `/:notificationId/read` | Mark as read | ✅ |
| `DELETE` | `/:notificationId` | Delete notification | ✅ |

---

### 7. Feedback Routes

**Base:** `/api/feedback`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/` | Submit claim feedback | ✅ |
| `GET` | `/` | List feedback history | ✅ |

---

## 🏗️ Service Architecture

### Simple Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Clinician)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AWS COGNITO (Authentication)                  │
│                  Returns JWT Token for API calls                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AWS API GATEWAY + WAF                         │
│              Validates Token, Rate Limits, Blocks Attacks        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express/Node.js)                 │
│                  Routes: /auth, /patients, /encounters,          │
│                   /claims, /ai, /notifications                   │
└─────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────┘
      │      │      │      │      │      │      │
      ↓      ↓      ↓      ↓      ↓      ↓      ↓
   ┌────┐ ┌───┐ ┌────┐ ┌────┐ ┌────┐ ┌──────┐ ┌──────┐
   │RDS │ │S3 │ │SQS │ │SNS │ │KMS │ │Secret│ │Cloud │
   │DB  │ │   │ │    │ │    │ │    │ │Mgr   │ │Watch │
   └────┘ └─┬─┘ └─┬──┘ └────┘ └────┘ └──────┘ └──────┘
           │     │
           ↓     ↓
      ┌────────────────┐
      │  EventBridge   │──→ Triggers
      └────────┬───────┘
               │
               ↓
      ┌────────────────┐
      │  AWS Lambda    │──→ AI Processing
      └────────┬───────┘
               │
               ├──→ Transcribe Medical (audio → text)
               ├──→ Comprehend Medical (extract medical data)
               └──→ Save results to RDS
```

---

### Detailed Service Relationships

#### 1. User Authentication Flow
```
User opens app
  ↓
Cognito → Email/Password authentication
  ↓
Returns JWT token
  ↓
Frontend stores token
  ↓
All API calls include: Authorization: Bearer <token>
  ↓
API Gateway validates token with Cognito
  ↓
WAF checks for malicious requests
  ↓
Request reaches Backend API
```

**Services Used:** Cognito → API Gateway → WAF → Backend

**API Call:**
```bash
POST /api/auth/login → Returns JWT token
All other APIs require: Authorization: Bearer <token>
```

---

#### 2. Audio Processing Flow (Core Feature)

```
Clinician uploads audio
  ↓
POST /api/encounters/:id/audio
  ↓
Backend receives file
  ↓
S3 stores audio (encrypted by KMS)
  ↓
EventBridge detects new file
  ↓
Lambda function triggered
  ↓
Transcribe Medical converts audio → text
  ↓
Lambda receives transcript
  ↓
POST /api/ai/generate-soap (internal)
  ↓
Comprehend Medical extracts medical terms
  ↓
Lambda generates SOAP note
  ↓
RDS saves SOAP note
  ↓
EventBridge triggers notification
  ↓
SNS sends email to clinician
  ↓
GET /api/encounters/:id → Frontend fetches SOAP
```

**Services Used:** API → S3 → EventBridge → Lambda → Transcribe Medical → Comprehend Medical → Lambda → RDS → EventBridge → SNS

**Key APIs:**
1. `POST /api/encounters/:id/audio` - Upload audio
2. `POST /api/ai/transcribe` - Internal: Convert to text
3. `POST /api/ai/generate-soap` - Internal: Generate SOAP
4. `GET /api/encounters/:id` - Fetch completed SOAP

---

#### 3. Database Operations Flow

```
API needs to query data
  ↓
Backend requests credentials
  ↓
Secrets Manager returns encrypted credentials
  ↓
KMS decrypts credentials
  ↓
Backend connects to RDS PostgreSQL
  ↓
Query executed (encrypted in transit via TLS)
  ↓
Data encrypted at rest (KMS)
  ↓
Query logged to CloudWatch
  ↓
Access logged to CloudTrail (audit)
  ↓
AWS Backup runs daily backup
```

**Services Used:** Backend → Secrets Manager → KMS → RDS → CloudWatch → CloudTrail → AWS Backup

**APIs Using Database:**
- `GET /api/patients` - Query patients table
- `POST /api/encounters` - Insert into encounters table
- `GET /api/claims` - Query claims table

---

#### 4. Claim Processing Flow

```
Clinician submits claim
  ↓
POST /api/claims
  ↓
Backend validates data
  ↓
SQS queues claim for processing
  ↓
Lambda picks up from queue
  ↓
Lambda validates claim format
  ↓
RDS saves claim
  ↓
EventBridge schedules submission
  ↓
Lambda submits to insurance API (external)
  ↓
RDS updates claim status
  ↓
EventBridge triggers notification
  ↓
SNS sends email: "Claim submitted"
  ↓
GET /api/notifications → Frontend shows alert
```

**Services Used:** API → SQS → Lambda → RDS → EventBridge → Lambda → SNS

**Key APIs:**
1. `POST /api/claims` - Create claim
2. `PUT /api/claims/:id/submit` - Submit to insurance
3. `GET /api/claims/:id` - Check status
4. `GET /api/notifications` - Get alerts

---

#### 5. Security & Compliance Flow

```
Every API request
  ↓
WAF checks for attacks (SQL injection, XSS, DDoS)
  ↓
API Gateway rate limits (1000 req/min per user)
  ↓
Cognito validates JWT token
  ↓
Backend processes request
  ↓
CloudTrail logs: who, what, when, IP address
  ↓
KMS encrypts all sensitive data
  ↓
CloudWatch monitors for anomalies
  ↓
If anomaly detected → SNS alerts security team
```

**Services Used:** WAF → API Gateway → Cognito → Backend → CloudTrail → KMS → CloudWatch → SNS

**Security APIs:**
- All routes protected by Cognito JWT
- CloudTrail tracks all API calls
- KMS encrypts data at rest

---

#### 6. Backup & Recovery Flow

```
Every day at 3 AM:
  ↓
AWS Backup triggered (automated)
  ↓
RDS snapshot created (encrypted by KMS)
  ↓
S3 files backed up to separate bucket
  ↓
AWS Backup replicates to second region
  ↓
CloudWatch confirms success
  ↓
Retention: 7 years (HIPAA compliance)
```

**Services Used:** AWS Backup → RDS → S3 → KMS → CloudWatch

**No direct API** - Automated daily process

---

#### 7. Notification Flow

```
Event occurs (SOAP ready, claim submitted, error, etc.)
  ↓
EventBridge detects event
  ↓
Lambda formats notification message
  ↓
SNS determines delivery method
  ↓
├─→ Email to clinician
├─→ SMS to admin (if urgent)
└─→ Push notification to app
  ↓
GET /api/notifications → User sees notification
```

**Services Used:** EventBridge → Lambda → SNS → API

**Key API:**
- `GET /api/notifications` - Fetch all notifications
- `PUT /api/notifications/:id/read` - Mark as read

---

## 🚀 Setup Commands

### 1. Install AWS CLI

```powershell
# Windows - Download and install
# Visit: https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
```

### 2. Configure AWS Credentials

```powershell
aws configure
# Enter:
# - AWS Access Key ID: (your key)
# - AWS Secret Access Key: (your secret)
# - Region: us-east-1
# - Output: json
```

### 3. Create Core Services

```powershell
# Navigate to backend
cd RevClear\backend

# Run setup commands (from aws-cli-commands.txt)
# Creates: RDS, S3, Cognito, CloudWatch, Secrets Manager, ECR
```

**Key Commands:**

```powershell
# Create RDS Database
aws rds create-db-instance `
    --db-instance-identifier revclear-db `
    --db-instance-class db.t3.micro `
    --engine postgres `
    --master-username revclear_admin `
    --master-user-password "ChangeThisPassword123!" `
    --allocated-storage 20 `
    --region us-east-1

# Create S3 Bucket
aws s3api create-bucket `
    --bucket revclear-storage-production `
    --region us-east-1

# Create Cognito User Pool
aws cognito-idp create-user-pool `
    --pool-name revclear-users `
    --region us-east-1

# Create CloudWatch Log Group
aws logs create-log-group `
    --log-group-name /aws/revclear/production `
    --region us-east-1

# Create Secrets Manager Secret
aws secretsmanager create-secret `
    --name revclear/database/credentials `
    --secret-string '{"username":"revclear_admin","password":"ChangeThisPassword123!"}' `
    --region us-east-1
```

### 4. Create Additional Services

```powershell
# Lambda Function
aws lambda create-function `
    --function-name revclear-transcribe-audio `
    --runtime nodejs18.x `
    --handler index.handler `
    --role arn:aws:iam::ACCOUNT_ID:role/lambda-role

# SQS Queue
aws sqs create-queue `
    --queue-name revclear-audio-processing

# SNS Topic
aws sns create-topic --name revclear-notifications

# KMS Key
aws kms create-key --description "RevClear encryption key"

# CloudTrail
aws cloudtrail create-trail `
    --name revclear-audit `
    --s3-bucket-name revclear-audit-logs
```

### 5. Install Backend Dependencies

```powershell
cd RevClear\backend

npm install @aws-sdk/client-rds-data `
            @aws-sdk/client-secrets-manager `
            @aws-sdk/client-cognito-identity-provider `
            @aws-sdk/client-s3 `
            @aws-sdk/s3-request-presigner `
            @aws-sdk/client-cloudwatch-logs `
            jwks-rsa `
            jsonwebtoken
```

### 6. Configure Environment Variables

Create `RevClear/backend/.env`:

```env
# AWS Region
AWS_REGION=us-east-1

# Database
DB_HOST=<RDS-endpoint>.rds.amazonaws.com
DB_PORT=5432
DB_NAME=revclear_db
DB_USER=revclear_admin
DB_PASSWORD=ChangeThisPassword123!

# Cognito
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_CLIENT_ID=your-client-id

# S3
AWS_S3_BUCKET=revclear-storage-production

# Secrets Manager
AWS_SECRET_NAME=revclear/database/credentials

# CloudWatch
AWS_LOG_GROUP=/aws/revclear/production
```

### 7. Setup Database Schema

```powershell
# Get database endpoint
$DB_HOST = aws rds describe-db-instances `
    --db-instance-identifier revclear-db `
    --query 'DBInstances[0].Endpoint.Address' `
    --output text

# Connect to database (requires psql)
psql -h $DB_HOST -U revclear_admin -d postgres

# Create database
CREATE DATABASE revclear_db;
\q

# Run schema
psql -h $DB_HOST -U revclear_admin -d revclear_db -f Documentation\db\002_cloud_db_schema.sql
```

### 8. Deploy Backend

```powershell
cd RevClear\backend

# Build
npm run build

# Deploy (if using ECS)
./aws-deploy.sh
```

---

## 📊 Cost Breakdown

### Monthly Cost Estimate

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **RDS PostgreSQL** | db.t3.micro, 20GB | $15.00 |
| **S3** | 50GB storage, 1K requests | $0.50 |
| **Cognito** | 1000 active users | Free |
| **CloudWatch** | 10GB logs, basic metrics | $5.00 |
| **Secrets Manager** | 1 secret | $0.50 |
| **ECR** | 10GB container storage | $1.00 |
| **Lambda** | 100K invocations, 512MB | $2.00 |
| **SQS** | 1M messages | $0.50 |
| **SNS** | 1K emails | $2.00 |
| **KMS** | 1 key, 10K requests | $1.00 |
| **EventBridge** | 100K events | Free |
| **CloudTrail** | 1 trail | $2.00 |
| **AWS Backup** | 100GB backup storage | $5.00 |
| **Transcribe Medical** | 1000 minutes | $25.00 |
| **Comprehend Medical** | 10K units | $10.00 |
| **WAF** | Basic rules | $5.00 |
| **API Gateway** | 1M requests | $3.50 |
| **Systems Manager** | Free tier | Free |

**Total: ~$78/month**

### Cost by Feature

| Feature | Services Used | Monthly Cost |
|---------|---------------|--------------|
| **Core Infrastructure** | RDS, S3, ECR | $16.50 |
| **Authentication** | Cognito | Free |
| **Monitoring** | CloudWatch, CloudTrail | $7.00 |
| **Security** | KMS, WAF, Secrets Manager | $6.50 |
| **AI Processing** | Lambda, Transcribe, Comprehend | $37.00 |
| **Notifications** | SNS, EventBridge | $2.00 |
| **Queuing** | SQS | $0.50 |
| **API Management** | API Gateway | $3.50 |
| **Backup** | AWS Backup | $5.00 |

---

## 🎬 Complete Scenario Example

### Real-World Workflow: Dr. Smith's Patient Visit

Let's follow a complete patient encounter from start to finish, showing every API call and service interaction.

---

#### **Part 1: Login** (9:00 AM)

**Action:** Dr. Smith opens the RevClear app and logs in

**API Call:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "dr.smith@clinic.com",
  "password": "SecurePass123!"
}
```

**What Happens:**
1. Frontend sends credentials to API Gateway
2. API Gateway routes to Backend API
3. Backend calls Cognito to verify credentials
4. Cognito validates and returns JWT token
5. Backend returns token to frontend
6. Frontend stores token in local storage
7. CloudTrail logs: "User dr.smith@clinic.com logged in at 9:00 AM from IP 192.168.1.100"

**Response:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "dr-smith-123",
    "email": "dr.smith@clinic.com",
    "name": "Dr. Jane Smith",
    "role": "clinician"
  }
}
```

**Services Used:** API Gateway → Backend → Cognito → CloudTrail

---

#### **Part 2: View Patient List** (9:05 AM)

**Action:** Dr. Smith views her patient list

**API Call:**
```bash
GET /api/patients
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What Happens:**
1. Frontend sends request with JWT token
2. API Gateway validates token with Cognito
3. WAF checks for malicious patterns (none found)
4. Backend receives request
5. Backend queries Secrets Manager for DB credentials
6. KMS decrypts credentials
7. Backend connects to RDS
8. RDS returns patients where clinician_id = 'dr-smith-123'
9. CloudWatch logs query execution time
10. CloudTrail logs: "Dr. Smith accessed patient list"

**Response:**
```json
{
  "patients": [
    {
      "id": "patient-john-doe",
      "full_name": "John Doe",
      "dob": "1985-03-22",
      "insurance_provider": "Blue Cross Blue Shield",
      "last_visit": "2025-10-15"
    },
    {
      "id": "patient-jane-roe",
      "full_name": "Jane Roe",
      "dob": "1990-07-08",
      "insurance_provider": "Aetna",
      "last_visit": "2025-10-20"
    }
  ]
}
```

**Services Used:** API Gateway → WAF → Cognito → Backend → Secrets Manager → KMS → RDS → CloudWatch → CloudTrail

---

#### **Part 3: Create New Encounter** (9:10 AM)

**Action:** Dr. Smith selects patient John Doe and starts a new encounter

**API Call:**
```bash
POST /api/encounters
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "patient-john-doe",
  "date_of_service": "2025-11-05T09:10:00Z"
}
```

**What Happens:**
1. Backend validates patient_id exists
2. Backend inserts new record into RDS encounters table
3. RDS encrypts data with KMS
4. Backend returns encounter ID
5. CloudTrail logs: "Dr. Smith created encounter for patient John Doe"

**Response:**
```json
{
  "encounter_id": "encounter-abc-123",
  "patient_id": "patient-john-doe",
  "status": "draft",
  "created_at": "2025-11-05T09:10:00Z"
}
```

**Services Used:** Backend → RDS → KMS → CloudTrail

---

#### **Part 4: Record Audio** (9:15 AM)

**Action:** Dr. Smith conducts patient visit and records the conversation

**API Call:**
```bash
POST /api/encounters/encounter-abc-123/audio
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <encounter-abc-123.mp3> (5 minutes, 8MB)
```

**What Happens:**
1. Backend receives audio file (8MB)
2. Backend uploads to S3 bucket: `s3://revclear-storage/audio/encounter-abc-123.mp3`
3. S3 encrypts file with KMS
4. Backend updates RDS: audio_url = "s3://revclear-storage/audio/encounter-abc-123.mp3"
5. S3 triggers EventBridge event: "New audio file uploaded"
6. CloudWatch logs upload success
7. CloudTrail logs: "Dr. Smith uploaded audio for encounter-abc-123"

**Response:**
```json
{
  "audio_url": "s3://revclear-storage/audio/encounter-abc-123.mp3",
  "duration": "5:23",
  "status": "processing",
  "message": "Audio uploaded successfully. Transcription in progress."
}
```

**Services Used:** Backend → S3 → KMS → RDS → EventBridge → CloudWatch → CloudTrail

---

#### **Part 5: Automatic AI Processing** (9:15-9:20 AM, Background)

**Trigger:** EventBridge detects new audio file

**What Happens (Automated):**

**Step 1: Transcription**
1. EventBridge triggers Lambda function: `revclear-transcribe-audio`
2. Lambda reads audio from S3
3. Lambda calls Transcribe Medical API
4. Transcribe Medical converts audio to text (takes 2-3 minutes)
5. CloudWatch logs: "Transcription started for encounter-abc-123"

**Transcript Generated:**
```text
"Patient John Doe, 40-year-old male, presents with complaints of 
persistent cough and fatigue for the past three days. No fever reported. 
Patient denies chest pain or shortness of breath. Physical examination 
reveals lungs clear to auscultation bilaterally. Vital signs: Blood 
pressure 120/80, heart rate 72, temperature 98.6°F. Assessment: Upper 
respiratory infection, likely viral etiology. Plan: Recommend rest, 
increased fluid intake, and over-the-counter cough medication. 
Follow-up if symptoms worsen or persist beyond 7 days."
```

**Step 2: SOAP Generation**
1. Lambda function: `revclear-generate-soap` triggered
2. Lambda sends transcript to Comprehend Medical
3. Comprehend Medical extracts medical entities
4. Lambda generates structured SOAP note
5. CloudWatch logs: "SOAP note generated for encounter-abc-123"

**SOAP Note Generated:**
```json
{
  "subjective": "40-year-old male with persistent cough and fatigue for 3 days. Denies fever, chest pain, or shortness of breath.",
  "objective": "Vitals: BP 120/80, HR 72, Temp 98.6°F. Lungs clear to auscultation bilaterally.",
  "assessment": "Upper respiratory infection, likely viral etiology",
  "plan": "Rest, increased fluids, OTC cough medication. Follow-up if symptoms worsen or persist >7 days."
}
```

**Step 3: Code Extraction**
1. Lambda function: `revclear-extract-codes` triggered
2. Lambda sends SOAP to Comprehend Medical
3. Comprehend Medical extracts medical codes
4. Lambda validates codes against ICD-10/CPT databases
5. CloudWatch logs: "Codes extracted for encounter-abc-123"

**Codes Extracted:**
```json
{
  "icd10_codes": [
    {
      "code": "J06.9",
      "description": "Acute upper respiratory infection, unspecified",
      "confidence": 0.95
    }
  ],
  "cpt_codes": [
    {
      "code": "99213",
      "description": "Office visit, established patient, moderate complexity",
      "confidence": 0.92
    }
  ]
}
```

**Step 4: Save Results**
1. Lambda updates RDS database
2. Encounter status changed from "processing" to "ready"
3. SOAP note and codes saved to database
4. KMS encrypts all data at rest

**Step 5: Send Notification**
1. EventBridge triggers notification Lambda
2. Lambda formats notification message
3. SNS sends email to dr.smith@clinic.com
4. SNS also creates in-app notification
5. CloudWatch logs: "Notification sent to Dr. Smith"

**Email Sent:**
```
Subject: SOAP Note Ready - John Doe

Hi Dr. Smith,

Your SOAP note for John Doe's visit on Nov 5, 2025 is ready for review.

Encounter ID: encounter-abc-123
Status: Ready for Review

Suggested Codes:
- ICD-10: J06.9 (Upper respiratory infection)
- CPT: 99213 (Office visit, moderate complexity)

Please review and approve at: https://app.revclear.com/encounters/encounter-abc-123

Best regards,
RevClear AI System
```

**Services Used:** EventBridge → Lambda → S3 → Transcribe Medical → Comprehend Medical → Lambda → RDS → KMS → EventBridge → Lambda → SNS → CloudWatch

---

#### **Part 6: Review SOAP Note** (9:25 AM)

**Action:** Dr. Smith receives notification and reviews the SOAP note

**API Call:**
```bash
GET /api/encounters/encounter-abc-123
Authorization: Bearer <token>
```

**What Happens:**
1. Backend queries RDS for encounter details
2. Returns SOAP note and suggested codes
3. CloudTrail logs: "Dr. Smith viewed encounter-abc-123"

**Response:**
```json
{
  "encounter_id": "encounter-abc-123",
  "patient": {
    "id": "patient-john-doe",
    "name": "John Doe"
  },
  "date_of_service": "2025-11-05T09:10:00Z",
  "status": "ready",
  "soap": {
    "subjective": "40-year-old male with persistent cough and fatigue for 3 days...",
    "objective": "Vitals: BP 120/80, HR 72, Temp 98.6°F...",
    "assessment": "Upper respiratory infection, likely viral etiology",
    "plan": "Rest, increased fluids, OTC cough medication..."
  },
  "codes": {
    "icd10": ["J06.9"],
    "cpt": ["99213"]
  },
  "ai_confidence": 0.94,
  "audio_url": "s3://revclear-storage/audio/encounter-abc-123.mp3"
}
```

**Services Used:** Backend → RDS → CloudTrail

---

#### **Part 7: Edit and Approve** (9:27 AM)

**Action:** Dr. Smith makes a minor edit to the plan section

**API Call:**
```bash
PUT /api/encounters/encounter-abc-123
Authorization: Bearer <token>
Content-Type: application/json

{
  "soap": {
    "subjective": "40-year-old male with persistent cough and fatigue for 3 days...",
    "objective": "Vitals: BP 120/80, HR 72, Temp 98.6°F...",
    "assessment": "Upper respiratory infection, likely viral etiology",
    "plan": "Rest, increased fluids, OTC cough medication (Dextromethorphan 10mg q6h). Follow-up if symptoms worsen or persist >7 days."
  },
  "status": "approved"
}
```

**What Happens:**
1. Backend updates encounter in RDS
2. Status changed to "approved"
3. CloudTrail logs: "Dr. Smith approved encounter-abc-123 with edits"

**Response:**
```json
{
  "message": "Encounter updated successfully",
  "status": "approved"
}
```

**Services Used:** Backend → RDS → CloudTrail

---

#### **Part 8: Create Claim** (9:30 AM)

**Action:** Dr. Smith creates an insurance claim from the encounter

**API Call:**
```bash
POST /api/claims
Authorization: Bearer <token>
Content-Type: application/json

{
  "encounter_id": "encounter-abc-123",
  "patient_id": "patient-john-doe",
  "diagnosis_codes": ["J06.9"],
  "procedure_codes": ["99213"],
  "insurance_provider": "Blue Cross Blue Shield",
  "policy_number": "BCBS-908273",
  "total_amount": 120.00
}
```

**What Happens:**
1. Backend validates encounter is approved
2. Backend creates claim record in RDS
3. SQS queues claim for processing
4. CloudTrail logs: "Dr. Smith created claim for encounter-abc-123"

**Response:**
```json
{
  "claim_id": "claim-xyz-789",
  "status": "queued",
  "message": "Claim created and queued for submission",
  "estimated_processing_time": "5 minutes"
}
```

**Services Used:** Backend → RDS → SQS → CloudTrail

---

#### **Part 9: Submit Claim** (9:35 AM, Background)

**Trigger:** SQS message triggers Lambda

**What Happens (Automated):**
1. Lambda picks up message from SQS queue
2. Lambda validates claim format
3. Lambda formats claim for insurance API (837 format)
4. Lambda submits to Blue Cross Blue Shield API
5. Insurance API responds with confirmation
6. Lambda updates RDS: claim status = "submitted"
7. EventBridge triggers notification Lambda
8. SNS sends confirmation email
9. CloudWatch logs: "Claim claim-xyz-789 submitted successfully"

**API Call to Insurance (Internal):**
```bash
POST https://api.bcbs.com/claims/submit
Authorization: Bearer <insurance-api-key>
Content-Type: application/json

{
  "provider_npi": "1234567890",
  "patient_member_id": "BCBS-908273",
  "service_date": "2025-11-05",
  "diagnosis_codes": ["J06.9"],
  "procedure_codes": ["99213"],
  "charge_amount": 120.00
}
```

**Insurance Response:**
```json
{
  "claim_id": "BCBS-2025-456789",
  "status": "received",
  "message": "Claim accepted for processing",
  "estimated_processing_days": 14
}
```

**Notification Email:**
```
Subject: Claim Submitted Successfully - John Doe

Hi Dr. Smith,

Your claim for John Doe has been successfully submitted to Blue Cross Blue Shield.

Claim ID: claim-xyz-789
Insurance Reference: BCBS-2025-456789
Amount: $120.00
Status: Submitted

Estimated processing time: 14 days

You'll receive an update when the claim is processed.

Best regards,
RevClear System
```

**Services Used:** SQS → Lambda → RDS → External Insurance API → EventBridge → Lambda → SNS → CloudWatch

---

#### **Part 10: Check Notifications** (9:40 AM)

**Action:** Dr. Smith checks her notifications

**API Call:**
```bash
GET /api/notifications
Authorization: Bearer <token>
```

**What Happens:**
1. Backend queries RDS notifications table
2. Returns all unread notifications for Dr. Smith
3. CloudTrail logs: "Dr. Smith viewed notifications"

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-1",
      "title": "SOAP Note Ready",
      "message": "Your SOAP note for John Doe is ready for review",
      "type": "info",
      "is_read": true,
      "created_at": "2025-11-05T09:20:00Z"
    },
    {
      "id": "notif-2",
      "title": "Claim Submitted",
      "message": "Claim for John Doe successfully submitted to Blue Cross Blue Shield",
      "type": "success",
      "is_read": false,
      "created_at": "2025-11-05T09:35:00Z"
    }
  ]
}
```

**Services Used:** Backend → RDS → CloudTrail

---

#### **Part 11: Mark Notification as Read** (9:41 AM)

**Action:** Dr. Smith marks the claim submission notification as read

**API Call:**
```bash
PUT /api/notifications/notif-2/read
Authorization: Bearer <token>
```

**What Happens:**
1. Backend updates notification in RDS
2. is_read field set to true
3. CloudTrail logs: "Dr. Smith marked notification notif-2 as read"

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

**Services Used:** Backend → RDS → CloudTrail

---

#### **Part 12: Logout** (10:00 AM)

**Action:** Dr. Smith logs out

**API Call:**
```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

**What Happens:**
1. Backend invalidates session (if using session management)
2. Frontend clears JWT token from storage
3. CloudTrail logs: "Dr. Smith logged out at 10:00 AM"

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Services Used:** Backend → CloudTrail

---

#### **Part 13: Nightly Backup** (3:00 AM next day)

**Trigger:** Scheduled EventBridge rule

**What Happens (Automated):**
1. EventBridge triggers AWS Backup at 3:00 AM
2. AWS Backup creates RDS snapshot (encrypted by KMS)
3. AWS Backup creates S3 backup to separate bucket
4. AWS Backup replicates to us-west-2 (second region)
5. CloudWatch confirms backup successful
6. Retention policy: 7 years (HIPAA compliance)
7. Old backups automatically deleted after 7 years

**Backup Details:**
- RDS Snapshot: `revclear-db-2025-11-06-03-00`
- S3 Backup: `s3://revclear-backups/2025-11-06/`
- Size: 2.5 GB
- Encrypted: Yes (KMS)
- Replicated: Yes (us-west-2)

**Services Used:** EventBridge → AWS Backup → RDS → S3 → KMS → CloudWatch

---

### 📊 Complete Service Usage Summary for This Scenario

| Service | Times Used | Purpose in Scenario |
|---------|------------|---------------------|
| **Cognito** | 2 | Login, token validation |
| **API Gateway** | 11 | All API requests |
| **WAF** | 11 | Security checks on all requests |
| **Backend API** | 11 | Process all API calls |
| **RDS PostgreSQL** | 15 | Store/retrieve data |
| **S3** | 3 | Store audio, backups |
| **KMS** | 18 | Encrypt everything |
| **Secrets Manager** | 1 | Get database credentials |
| **CloudWatch** | 15 | Log all operations |
| **CloudTrail** | 13 | Audit all actions |
| **EventBridge** | 4 | Trigger automations |
| **Lambda** | 5 | AI processing, notifications |
| **Transcribe Medical** | 1 | Audio to text |
| **Comprehend Medical** | 2 | Extract medical data |
| **SQS** | 1 | Queue claim processing |
| **SNS** | 2 | Send notifications |
| **AWS Backup** | 1 | Daily backup |

**Total Service Interactions: 96**

---

### ⏱️ Timeline Summary

| Time | Action | Services Used | Duration |
|------|--------|---------------|----------|
| 9:00 AM | Login | Cognito, API, CloudTrail | 2 sec |
| 9:05 AM | View patients | API, RDS, KMS, CloudTrail | 1 sec |
| 9:10 AM | Create encounter | API, RDS, CloudTrail | 1 sec |
| 9:15 AM | Upload audio | API, S3, KMS, EventBridge | 5 sec |
| 9:15-9:20 AM | **AI Processing** | Lambda, Transcribe, Comprehend, RDS | 5 min |
| 9:20 AM | **Notification sent** | EventBridge, Lambda, SNS | 2 sec |
| 9:25 AM | Review SOAP | API, RDS | 2 min |
| 9:27 AM | Edit & approve | API, RDS | 30 sec |
| 9:30 AM | Create claim | API, RDS, SQS | 2 sec |
| 9:35 AM | **Claim submitted** | SQS, Lambda, Insurance API | 5 min |
| 9:35 AM | **Notification sent** | EventBridge, SNS | 2 sec |
| 9:40 AM | Check notifications | API, RDS | 1 sec |
| 9:41 AM | Mark as read | API, RDS | 1 sec |
| 10:00 AM | Logout | API, CloudTrail | 1 sec |
| 3:00 AM (next day) | **Nightly backup** | AWS Backup, RDS, S3 | 30 min |

**Total active time: ~20 minutes**
**Background processing: ~40 minutes**

---

### 💰 Cost for This Single Encounter

| Service | Usage | Cost |
|---------|-------|------|
| API Gateway | 11 requests | $0.000004 |
| Lambda | 5 invocations | $0.0001 |
| Transcribe Medical | 5 minutes audio | $0.125 |
| Comprehend Medical | 500 text units | $0.05 |
| RDS | Queries included | $0 |
| S3 | 8MB storage + requests | $0.0002 |
| SQS | 1 message | $0.0000004 |
| SNS | 2 emails | $0.002 |
| CloudWatch | Logs included | $0 |
| Other services | Fixed monthly | $0 |

**Total cost for one encounter: ~$0.18**

**Monthly cost for 500 encounters: ~$90**

---

## 🎓 Key Takeaways

### 1. Service Relationships
- **Cognito** authenticates ALL API calls
- **API Gateway** is the entry point for everything
- **Backend API** orchestrates all services
- **RDS** is the source of truth for data
- **Lambda** handles all AI processing
- **CloudTrail** audits everything (HIPAA requirement)
- **KMS** encrypts everything at rest

### 2. API Flow
- Login → Get token → Use token in all requests
- All routes require `Authorization: Bearer <token>`
- WAF protects every request
- CloudTrail logs every action

### 3. AI Processing Flow
- Upload audio → S3 → EventBridge → Lambda → Transcribe → Comprehend → SOAP → Notification
- Completely automated, takes 5-10 minutes
- Clinician reviews and approves

### 4. Security Layers
- **Network:** WAF blocks attacks
- **Authentication:** Cognito validates users
- **Encryption:** KMS encrypts all data
- **Audit:** CloudTrail records everything
- **Backup:** AWS Backup ensures recovery

### 5. Cost Efficiency
- Most AWS services have generous free tiers
- AI processing (Transcribe) is the main cost
- ~$0.18 per encounter is very reasonable
- Total ~$78/month for small practice

---

## 🚀 Next Steps for Your Team

### Week 1: Setup Core Services ✓
- [x] Install AWS CLI
- [x] Configure credentials
- [x] Create RDS, S3, Cognito
- [x] Test database connection

### Week 2: Implement APIs
- [ ] Create all API routes (/auth, /patients, /encounters, /claims)
- [ ] Test with Postman
- [ ] Add JWT authentication
- [ ] Implement error handling

### Week 3: AI Integration
- [ ] Create Lambda functions
- [ ] Integrate Transcribe Medical
- [ ] Integrate Comprehend Medical
- [ ] Test end-to-end audio processing

### Week 4: Notifications & Automation
- [ ] Set up SNS topics
- [ ] Create EventBridge rules
- [ ] Configure email templates
- [ ] Test automated workflows

### Week 5: Security & Compliance
- [ ] Enable CloudTrail
- [ ] Configure AWS Backup
- [ ] Set up WAF rules
- [ ] Test security measures

### Week 6: Testing & Launch
- [ ] Integration testing
- [ ] Load testing
- [ ] Security audit
- [ ] Production deployment

---

## 📞 Support & Resources

### Documentation Files
- ✅ This file: Complete guide (all-in-one)
- `AWS_SETUP_GUIDE.md` - Detailed setup steps
- `aws-cli-commands.txt` - PowerShell commands
- `aws-services.sh` - Bash setup script
- `AWS_DEPENDENCIES.md` - NPM packages needed

### AWS Resources
- AWS Console: https://console.aws.amazon.com
- AWS CLI Docs: https://docs.aws.amazon.com/cli
- Cognito Docs: https://docs.aws.amazon.com/cognito
- RDS Docs: https://docs.aws.amazon.com/rds
- Lambda Docs: https://docs.aws.amazon.com/lambda

### Team Communication
- Post questions in team Slack channel
- Check existing issues in GitHub
- Review CloudWatch logs for errors
- Use CloudTrail for debugging

---

## ✅ Checklist for Team Members

### Before Starting
- [ ] Read this entire document
- [ ] Install AWS CLI
- [ ] Get AWS credentials from team lead
- [ ] Clone the aws-migration branch
- [ ] Install Node.js dependencies

### Understanding
- [ ] I understand all 18 AWS services
- [ ] I understand how services connect
- [ ] I understand the API routes
- [ ] I can follow the scenario example
- [ ] I know where to find costs

### Development
- [ ] Backend runs locally
- [ ] Can connect to RDS database
- [ ] Can test APIs with Postman
- [ ] Can upload files to S3
- [ ] Can view CloudWatch logs

### Deployment
- [ ] Know how to deploy Lambda functions
- [ ] Know how to run AWS CLI commands
- [ ] Know how to check service status
- [ ] Know how to view costs

---

**🎉 You're Ready to Build!**

This document contains everything your team needs to understand and implement RevClear on AWS. Good luck! 🚀

---

**Last Updated:** November 5, 2025  
**Branch:** aws-migration  
**Author:** AI Assistant  
**Maintained by:** RevClear Team
