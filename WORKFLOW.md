# 🔄 Complete Workflow: API Call Sequence

This document shows the exact sequence of API calls made during the interactive demo when processing a medical claim through the HIPAA AI system.

## 📊 Workflow Overview

```
Start Demo → 15 API Calls → Claim Submitted
├── Authentication (1 call)
├── Upload & Storage (2 calls)
├── Speech-to-Text (2 calls)
├── HITL Gate 1 (1 call)
├── AI Analysis (2 calls)
├── HITL Gate 2 (1 call)
├── FHIR & EDI (2 calls)
├── HITL Gate 3 (1 call)
├── Publishing (1 call)
└── External Submission (2 calls)
```

---

## Step-by-Step API Calls

### Step 1: Authentication & Upload

#### Call #1: Authenticate User
```
POST /api/v1/auth/login
```
**Request:**
```json
{
  "email": "dr.smith@clinic.com",
  "mfa_code": "123456"
}
```
**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user_id": "usr_12345",
  "role": "clinician"
}
```
**GCP Services**: Identity Platform, Secret Manager

---

#### Call #2: Upload Audio File
```
POST /api/v1/claims/upload
```
**Request:**
```json
{
  "patient_id": "PAT-2025-001",
  "file_name": "consultation_20251030.mp3",
  "file_size": "2.4 MB",
  "session_type": "initial_consultation"
}
```
**Response:**
```json
{
  "upload_id": "upl_789xyz",
  "gcs_path": "gs://clinic-audio/2025/10/consultation_20251030.mp3",
  "status": "uploaded"
}
```
**GCP Services**: Cloud Storage, Cloud KMS (encryption), Cloud Audit Logs

---

### Step 2: Speech-to-Text Processing

#### Call #3: Start Transcription
```
POST /api/v1/transcription/start
```
**Request:**
```json
{
  "upload_id": "upl_789xyz",
  "language": "en-US",
  "model": "medical_conversation",
  "enable_word_confidence": true
}
```
**Response:**
```json
{
  "job_id": "trans_456abc",
  "status": "processing"
}
```
**GCP Services**: Speech-to-Text API, Cloud Storage

---

#### Call #4: Get Transcription Result
```
GET /api/v1/transcription/trans_456abc
```
**Response:**
```json
{
  "job_id": "trans_456abc",
  "status": "completed",
  "text": "Patient presents with persistent cough for 2 weeks, fever of 101°F, and chest congestion. Physical examination reveals crackles in lower right lung. Diagnosed with acute bronchitis. Prescribed azithromycin 250mg and recommended rest.",
  "confidence": 0.94,
  "word_count": 47
}
```
**GCP Services**: Speech-to-Text API (retrieve result)

---

### Step 3: 🔍 HITL Gate 1 - Transcription Review

#### Call #5: Approve Transcription
```
POST /api/v1/hitl/transcription/approve
```
**Request:**
```json
{
  "job_id": "trans_456abc",
  "reviewer_id": "usr_12345",
  "approved": true,
  "corrections": null
}
```
**Response:**
```json
{
  "status": "approved",
  "next_stage": "ai_analysis"
}
```
**GCP Services**: Cloud SQL (record approval), Cloud Audit Logs, Pub/Sub (trigger next stage)

---

### Step 4: AI Analysis & Code Extraction

#### Call #6: Extract CPT/ICD Codes
```
POST /api/v1/ai/extract-codes
```
**Request:**
```json
{
  "transcription_id": "trans_456abc",
  "model": "medical-coder-v2",
  "patient_history_id": "PAT-2025-001"
}
```
**Response:**
```json
{
  "diagnosis": "Acute Bronchitis",
  "icd10_code": "J20.9",
  "cpt_code": "99213",
  "confidence_scores": {
    "icd10": 0.92,
    "cpt": 0.88
  },
  "supporting_evidence": [
    "persistent cough for 2 weeks",
    "fever of 101°F",
    "crackles in lower right lung"
  ]
}
```
**GCP Services**: Vertex AI (medical coding model), Cloud SQL (patient history)

---

#### Call #7: Validate Codes
```
GET /api/v1/codes/validate?icd10=J20.9&cpt=99213
```
**Response:**
```json
{
  "icd10_valid": true,
  "cpt_valid": true,
  "compatible": true,
  "warnings": []
}
```
**GCP Services**: Cloud SQL PostgreSQL (CPT/ICD reference database)

---

### Step 5: 🔍 HITL Gate 2 - Medical Coding Review

#### Call #8: Approve Codes
```
POST /api/v1/hitl/codes/approve
```
**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "reviewer_id": "coder_789",
  "icd10_approved": "J20.9",
  "cpt_approved": "99213",
  "notes": "Codes appropriate for documented diagnosis"
}
```
**Response:**
```json
{
  "status": "approved",
  "next_stage": "edi_generation"
}
```
**GCP Services**: Cloud SQL, Cloud Audit Logs, Pub/Sub

---

### Step 6: FHIR & EDI Generation

#### Call #9: Create FHIR Claim
```
POST /api/v1/fhir/create-claim
```
**Request:**
```json
{
  "patient_id": "PAT-2025-001",
  "provider_id": "PRV-12345",
  "diagnosis_code": "J20.9",
  "procedure_code": "99213",
  "service_date": "2025-10-30"
}
```
**Response:**
```json
{
  "fhir_claim_id": "Claim/clm-fhir-001",
  "resourceType": "Claim",
  "status": "active"
}
```
**GCP Services**: Healthcare API (FHIR Store), Cloud KMS

---

#### Call #10: Generate EDI 837
```
POST /api/v1/edi/generate-837
```
**Request:**
```json
{
  "fhir_claim_id": "Claim/clm-fhir-001",
  "format": "837P",
  "payer_id": "PAYER-001"
}
```
**Response:**
```json
{
  "edi_file_id": "edi_837_20251030_001",
  "gcs_path": "gs://clinic-claims/2025/10/837_001.txt",
  "segments_count": 42
}
```
**GCP Services**: Healthcare API (EDI generation), Cloud Storage

---

### Step 7: 🔍 HITL Gate 3 - Final Billing Review

#### Call #11: Approve for Submission
```
POST /api/v1/hitl/billing/approve
```
**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "reviewer_id": "billing_456",
  "compliance_check": "passed",
  "approved_for_submission": true
}
```
**Response:**
```json
{
  "status": "approved",
  "next_stage": "external_submission"
}
```
**GCP Services**: Cloud SQL, Cloud Audit Logs, Pub/Sub

---

### Step 8: Publishing & External Submission

#### Call #12: Publish Claim Event
```
POST /api/v1/pubsub/publish
```
**Request:**
```json
{
  "topic": "claims-approved",
  "message": {
    "claim_id": "CLM-2025-10-30-001",
    "status": "approved",
    "timestamp": "2025-10-30T10:26:00Z"
  }
}
```
**Response:**
```json
{
  "message_id": "msg_pub123",
  "published": true
}
```
**GCP Services**: Cloud Pub/Sub

---

#### Call #13: Submit to Clearinghouse
```
POST /api/v1/clearinghouse/submit
```
**Request:**
```json
{
  "edi_file_id": "edi_837_20251030_001",
  "clearinghouse": "Availity",
  "payer_id": "PAYER-001"
}
```
**Response:**
```json
{
  "submission_id": "SUB-2025-10-30-001",
  "tracking_id": "CLM-2025-10-30-001",
  "status": "submitted",
  "estimated_response": "24-48 hours"
}
```
**GCP Services**: Cloud Run (external API call), Cloud Logging

---

#### Call #14: Store in BigQuery
```
POST /api/v1/analytics/store
```
**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "dataset": "claims_analytics",
  "table": "processed_claims"
}
```
**Response:**
```json
{
  "rows_inserted": 1,
  "job_id": "bq_job_789"
}
```
**GCP Services**: BigQuery, Cloud KMS (encrypt data)

---

## 📈 Summary Statistics

| Metric | Value |
|--------|-------|
| **Total API Calls** | 14 |
| **Authentication Calls** | 1 |
| **Data Processing Calls** | 6 |
| **HITL Approval Calls** | 3 |
| **External Integration Calls** | 2 |
| **Analytics Calls** | 1 |
| **Total Time (Demo)** | ~15 seconds |
| **Production Time (Estimated)** | 5-10 minutes |

---

## 🔐 Security & Compliance Checkpoints

Each API call includes:

✅ **JWT Authentication** - Bearer token validation  
✅ **Role-Based Access Control** - Permission checks  
✅ **Audit Logging** - Every action logged to Cloud Audit Logs  
✅ **Encryption** - TLS 1.3 in transit, KMS at rest  
✅ **Rate Limiting** - Prevent abuse  
✅ **Request Validation** - Input sanitization  
✅ **HIPAA Compliance** - PHI handling per regulations

---

## 🎯 HITL Gate Details

### Gate 1: Transcription Review
- **Purpose**: Verify AI transcription accuracy
- **Reviewer**: Medical professional (clinician)
- **API Call**: `POST /api/v1/hitl/transcription/approve`
- **Options**: Approve, Reject, Edit
- **Required**: Yes (cannot skip)

### Gate 2: Medical Coding Review
- **Purpose**: Validate CPT/ICD codes
- **Reviewer**: Certified medical coder (CPC/CCS)
- **API Call**: `POST /api/v1/hitl/codes/approve`
- **Options**: Approve, Modify, Reject
- **Required**: Yes (cannot skip)

### Gate 3: Final Billing Review
- **Purpose**: Compliance and quality assurance
- **Reviewer**: Billing specialist
- **API Call**: `POST /api/v1/hitl/billing/approve`
- **Options**: Approve, Hold, Reject
- **Required**: Yes (cannot skip)

---

## 🌐 GCP Services Usage Map

| Step | API Call | GCP Services Used |
|------|----------|-------------------|
| 1 | `/auth/login` | Identity Platform, Secret Manager |
| 1 | `/claims/upload` | Cloud Storage, Cloud KMS, Audit Logs |
| 2 | `/transcription/start` | Speech-to-Text API, Cloud Storage |
| 2 | `/transcription/{id}` | Speech-to-Text API |
| 3 | `/hitl/transcription/approve` | Cloud SQL, Audit Logs, Pub/Sub |
| 4 | `/ai/extract-codes` | Vertex AI, Cloud SQL |
| 4 | `/codes/validate` | Cloud SQL PostgreSQL |
| 5 | `/hitl/codes/approve` | Cloud SQL, Audit Logs, Pub/Sub |
| 6 | `/fhir/create-claim` | Healthcare API, Cloud KMS |
| 6 | `/edi/generate-837` | Healthcare API, Cloud Storage |
| 7 | `/hitl/billing/approve` | Cloud SQL, Audit Logs, Pub/Sub |
| 8 | `/pubsub/publish` | Cloud Pub/Sub |
| 8 | `/clearinghouse/submit` | Cloud Run, Cloud Logging |
| 8 | `/analytics/store` | BigQuery, Cloud KMS |

**Total GCP Services**: 12 different services

---

## 💰 Estimated GCP Costs (per claim)

| Service | Usage | Est. Cost |
|---------|-------|-----------|
| Speech-to-Text | 3 min audio | $0.048 |
| Vertex AI | 1 prediction | $0.02 |
| Cloud Storage | 2.4 MB storage | $0.0001 |
| Cloud SQL | 10 queries | $0.001 |
| Healthcare API | 2 operations | $0.002 |
| BigQuery | 1 row insert | $0.0001 |
| Cloud Run | 15 requests | $0.001 |
| Other services | Various | $0.005 |
| **Total per claim** | | **~$0.08** |

**Monthly cost for 1,000 claims**: ~$80  
**Annual cost for 12,000 claims**: ~$960

---

## 🚀 Performance Metrics

| Stage | API Calls | Avg Time | Can Parallelize? |
|-------|-----------|----------|------------------|
| Authentication | 1 | <1s | No |
| Upload | 1 | 2-5s | No |
| Transcription | 2 | 30-90s | No |
| HITL Gate 1 | 1 | Human time | No |
| AI Analysis | 2 | 2-5s | Yes (both calls) |
| HITL Gate 2 | 1 | Human time | No |
| FHIR/EDI | 2 | 1-3s | Yes (sequential) |
| HITL Gate 3 | 1 | Human time | No |
| Submission | 3 | 2-5s | Yes (all calls) |

**Total Machine Time**: ~40-110 seconds  
**Total Human Time**: Variable (3 reviews, ~5-15 min each)  
**Total End-to-End**: 15-45 minutes typical

---

## 🔄 Error Handling & Retry Logic

Each API call implements:

1. **Exponential Backoff**: Retry with increasing delays
2. **Circuit Breaker**: Stop calling failing services
3. **Fallback**: Alternative paths if primary fails
4. **Logging**: All errors logged for debugging
5. **User Notification**: Clear error messages
6. **State Persistence**: Resume from last successful step

---

## 📝 Audit Trail Example

For claim `CLM-2025-10-30-001`:

```
2025-10-30 10:15:30 | usr_12345 | POST /api/v1/claims/upload | SUCCESS
2025-10-30 10:15:32 | SYSTEM | POST /api/v1/transcription/start | SUCCESS
2025-10-30 10:16:45 | SYSTEM | GET /api/v1/transcription/trans_456abc | SUCCESS
2025-10-30 10:18:00 | usr_12345 | POST /api/v1/hitl/transcription/approve | SUCCESS
2025-10-30 10:20:00 | SYSTEM | POST /api/v1/ai/extract-codes | SUCCESS
2025-10-30 10:20:15 | SYSTEM | GET /api/v1/codes/validate | SUCCESS
2025-10-30 10:22:00 | coder_789 | POST /api/v1/hitl/codes/approve | SUCCESS
2025-10-30 10:24:00 | SYSTEM | POST /api/v1/fhir/create-claim | SUCCESS
2025-10-30 10:25:00 | SYSTEM | POST /api/v1/edi/generate-837 | SUCCESS
2025-10-30 10:26:00 | billing_456 | POST /api/v1/hitl/billing/approve | SUCCESS
2025-10-30 10:26:05 | SYSTEM | POST /api/v1/pubsub/publish | SUCCESS
2025-10-30 10:27:00 | SYSTEM | POST /api/v1/clearinghouse/submit | SUCCESS
2025-10-30 10:28:00 | SYSTEM | POST /api/v1/analytics/store | SUCCESS
```

**Retention**: 7 years (HIPAA requirement)  
**Storage**: Cloud Logging → BigQuery (long-term)

---

## 🎓 How to View API Calls in Demo

1. Open `index.html` in your browser
2. Click **"Interactive Demo"** tab
3. Click **"📡 API Calls"** button (top right)
4. Click **"Start Demo"** button
5. Watch API calls appear in real-time!
6. Approve each HITL gate to see more calls

The tracker shows:
- HTTP method (POST, GET, PUT)
- Full endpoint path
- Description
- Request payload
- Response data
- Timestamp

---

**Last Updated**: October 30, 2025  
**Demo Version**: 1.0.0  
**Status**: Production-Ready Architecture
