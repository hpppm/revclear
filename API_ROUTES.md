# 🔌 HIPAA AI Medical Claims System - API Routes Documentation

Complete backend API reference for the RevClear medical claims processing system.

## 📋 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [File Upload & Storage](#file-upload--storage)
3. [Speech-to-Text Processing](#speech-to-text-processing)
4. [HITL Gate 1: Transcription Review](#hitl-gate-1-transcription-review)
5. [AI Code Extraction](#ai-code-extraction-vertex-ai)
6. [Code Validation](#code-validation-cloud-sql)
7. [HITL Gate 2: Medical Coding Review](#hitl-gate-2-medical-coding-review)
8. [Healthcare API (FHIR & EDI)](#healthcare-api-fhir--edi)
9. [HITL Gate 3: Final Billing Review](#hitl-gate-3-final-billing-review)
10. [Event Publishing](#event-publishing-pubsub)
11. [External Submission](#external-submission-clearinghouse)
12. [Analytics](#analytics-bigquery)
13. [Audit & Compliance](#audit--compliance)

---

## Base Configuration

- **Base URL**: `https://api.revclear.health`
- **Version**: v1
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **Rate Limit**: 1000 requests/minute per user
- **Encryption**: TLS 1.3

### Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-10-30T10:15:30Z",
  "request_id": "req_abc123"
}
```

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Detailed error message",
    "field": "optional_field_name"
  },
  "timestamp": "2025-10-30T10:15:30Z",
  "request_id": "req_abc123"
}
```

---

## Authentication & Authorization

### POST `/api/v1/auth/login`

Authenticate clinician with SSO + MFA integration.

**Request:**
```json
{
  "email": "dr.smith@clinic.com",
  "password": "encrypted_password",
  "mfa_code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_abc123xyz",
    "expires_in": 3600,
    "user": {
      "id": "usr_12345",
      "name": "Dr. John Smith",
      "role": "clinician",
      "permissions": ["claims:create", "claims:read"]
    }
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - MFA required
- `429 Too Many Requests` - Rate limit exceeded

---

### POST `/api/v1/auth/refresh`

Refresh expired JWT token.

**Request:**
```json
{
  "refresh_token": "refresh_abc123xyz"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

### POST `/api/v1/auth/logout`

Invalidate session and revoke tokens.

**Request:**
```json
{
  "token": "current_jwt_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

---

## File Upload & Storage

### POST `/api/v1/claims/upload`

Upload audio file to Google Cloud Storage with encryption.

**Request (multipart/form-data):**
```
POST /api/v1/claims/upload
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="consultation.mp3"
Content-Type: audio/mpeg

[binary audio data]
------WebKitFormBoundary
Content-Disposition: form-data; name="metadata"

{
  "patient_id": "PAT-2025-001",
  "session_type": "initial_consultation",
  "provider_id": "PRV-12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upload_id": "upl_789xyz",
    "gcs_path": "gs://clinic-audio-encrypted/2025/10/consultation_20251030.mp3",
    "file_name": "consultation.mp3",
    "file_size": 2457600,
    "mime_type": "audio/mpeg",
    "encrypted": true,
    "kms_key": "projects/PROJECT/locations/us-central1/keyRings/clinic/cryptoKeys/audio-key",
    "uploaded_at": "2025-10-30T10:15:30Z"
  }
}
```

**Cloud Services Called:**
- Cloud Storage (encrypted bucket)
- Cloud KMS (encryption key)
- Cloud Audit Logs (access log)

---

### GET `/api/v1/claims/upload/{upload_id}`

Check upload status and retrieve metadata.

**Response:**
```json
{
  "success": true,
  "data": {
    "upload_id": "upl_789xyz",
    "status": "uploaded",
    "gcs_path": "gs://clinic-audio-encrypted/2025/10/consultation_20251030.mp3",
    "file_size": 2457600,
    "uploaded_by": "usr_12345",
    "uploaded_at": "2025-10-30T10:15:30Z"
  }
}
```

---

## Speech-to-Text Processing

### POST `/api/v1/transcription/start`

Trigger Google Speech-to-Text API for medical transcription.

**Request:**
```json
{
  "upload_id": "upl_789xyz",
  "language": "en-US",
  "model": "medical_conversation",
  "enable_word_confidence": true,
  "enable_automatic_punctuation": true,
  "speaker_diarization": true,
  "metadata": {
    "interaction_type": "DISCUSSION",
    "industry_naics_code_of_audio": "621111"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "trans_456abc",
    "status": "processing",
    "estimated_completion": "2025-10-30T10:17:00Z",
    "gcs_uri": "gs://clinic-audio-encrypted/2025/10/consultation_20251030.mp3"
  }
}
```

**Cloud Services Called:**
- Cloud Speech-to-Text API
- Cloud Storage (read audio file)
- Secret Manager (API credentials)

---

### GET `/api/v1/transcription/{job_id}`

Poll transcription job status and retrieve result.

**Response (Processing):**
```json
{
  "success": true,
  "data": {
    "job_id": "trans_456abc",
    "status": "processing",
    "progress": 65
  }
}
```

**Response (Completed):**
```json
{
  "success": true,
  "data": {
    "job_id": "trans_456abc",
    "status": "completed",
    "text": "Patient presents with persistent cough for 2 weeks, fever of 101°F, and chest congestion. Physical examination reveals crackles in lower right lung. Diagnosed with acute bronchitis. Prescribed azithromycin 250mg and recommended rest.",
    "confidence": 0.94,
    "word_count": 47,
    "duration_seconds": 180,
    "words": [
      {
        "word": "Patient",
        "start_time": "0.0s",
        "end_time": "0.5s",
        "confidence": 0.98
      }
    ],
    "completed_at": "2025-10-30T10:16:45Z"
  }
}
```

---

## HITL Gate 1: Transcription Review

### POST `/api/v1/hitl/transcription/approve`

Medical professional approves transcription accuracy.

**Request:**
```json
{
  "job_id": "trans_456abc",
  "reviewer_id": "usr_12345",
  "approved": true,
  "corrections": null,
  "notes": "Transcription is accurate and complete"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "reviewed_by": "Dr. John Smith",
    "reviewed_at": "2025-10-30T10:18:00Z",
    "next_stage": "ai_analysis",
    "audit_log_id": "audit_log_001"
  }
}
```

**Cloud Services Called:**
- Cloud SQL (store approval record)
- Cloud Audit Logs (HITL approval event)
- Pub/Sub (trigger next stage)

---

### POST `/api/v1/hitl/transcription/reject`

Request corrections or re-transcription.

**Request:**
```json
{
  "job_id": "trans_456abc",
  "reviewer_id": "usr_12345",
  "reason": "incorrect_medical_terminology",
  "specific_issues": [
    {
      "text": "bronchitis",
      "correction": "bronchiolitis",
      "timestamp": "0:45"
    }
  ]
}
```

---

### PUT `/api/v1/hitl/transcription/{job_id}/edit`

Edit transcription text with version tracking.

**Request:**
```json
{
  "job_id": "trans_456abc",
  "editor_id": "usr_12345",
  "new_text": "Patient presents with persistent cough...",
  "change_summary": "Corrected diagnosis terminology"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "trans_456abc",
    "version": 2,
    "edited_by": "Dr. John Smith",
    "edited_at": "2025-10-30T10:19:00Z",
    "previous_versions": ["v1"]
  }
}
```

---

## AI Code Extraction (Vertex AI)

### POST `/api/v1/ai/extract-codes`

Vertex AI analyzes transcription and suggests CPT/ICD codes.

**Request:**
```json
{
  "transcription_id": "trans_456abc",
  "model": "medical-coder-v2",
  "patient_history_id": "PAT-2025-001",
  "include_confidence_scores": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "diagnosis": "Acute Bronchitis",
    "icd10_code": "J20.9",
    "icd10_description": "Acute bronchitis, unspecified",
    "cpt_code": "99213",
    "cpt_description": "Office or other outpatient visit, established patient, level 3",
    "confidence_scores": {
      "icd10": 0.92,
      "cpt": 0.88
    },
    "supporting_evidence": [
      "persistent cough for 2 weeks",
      "fever of 101°F",
      "crackles in lower right lung"
    ],
    "alternative_codes": [
      {
        "icd10": "J20.0",
        "description": "Acute bronchitis due to Mycoplasma pneumoniae",
        "confidence": 0.75
      }
    ],
    "model_version": "medical-coder-v2.1.0",
    "analyzed_at": "2025-10-30T10:20:00Z"
  }
}
```

**Cloud Services Called:**
- Vertex AI (medical coding model)
- Cloud SQL (patient history lookup)
- Secret Manager (model API keys)

---

### GET `/api/v1/ai/suggestions/{claim_id}`

Retrieve AI-generated code suggestions.

**Response:**
```json
{
  "success": true,
  "data": {
    "claim_id": "CLM-2025-10-30-001",
    "suggestions": [ ... ],
    "status": "ready_for_review"
  }
}
```

---

### POST `/api/v1/ai/feedback`

Submit feedback to improve AI model (reinforcement learning).

**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "original_suggestion": {
    "icd10": "J20.9",
    "cpt": "99213"
  },
  "final_codes": {
    "icd10": "J20.0",
    "cpt": "99213"
  },
  "feedback_type": "correction",
  "notes": "Specific pathogen identified in lab results"
}
```

---

## Code Validation (Cloud SQL)

### GET `/api/v1/codes/validate`

Validate CPT/ICD codes against reference database.

**Request:**
```
GET /api/v1/codes/validate?icd10=J20.9&cpt=99213&payer_id=PAYER-001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "icd10_valid": true,
    "icd10_active": true,
    "icd10_effective_date": "2015-10-01",
    "cpt_valid": true,
    "cpt_active": true,
    "cpt_effective_year": 2025,
    "compatible": true,
    "payer_accepts": true,
    "warnings": [],
    "recommendations": []
  }
}
```

**Cloud Services Called:**
- Cloud SQL PostgreSQL (CPT/ICD reference database)

---

## HITL Gate 2: Medical Coding Review

### POST `/api/v1/hitl/codes/approve`

Certified medical coder validates CPT/ICD codes.

**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "reviewer_id": "coder_789",
  "icd10_approved": "J20.9",
  "cpt_approved": "99213",
  "modifiers": [],
  "notes": "Codes appropriate for documented diagnosis and service level",
  "certification": "CPC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "reviewed_by": "Jane Doe, CPC",
    "reviewed_at": "2025-10-30T10:22:00Z",
    "next_stage": "edi_generation",
    "audit_log_id": "audit_log_002"
  }
}
```

---

### PUT `/api/v1/hitl/codes/modify`

Coder modifies codes with justification.

**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "reviewer_id": "coder_789",
  "modifications": [
    {
      "field": "icd10_code",
      "original": "J20.9",
      "new": "J20.0",
      "reason": "Lab results identified specific pathogen"
    }
  ]
}
```

---

## Healthcare API (FHIR & EDI)

### POST `/api/v1/fhir/create-claim`

Create FHIR Claim resource in Google Healthcare API.

**Request:**
```json
{
  "patient_id": "PAT-2025-001",
  "provider_id": "PRV-12345",
  "diagnosis_code": "J20.9",
  "procedure_code": "99213",
  "service_date": "2025-10-30",
  "billing_provider": {
    "npi": "1234567890",
    "name": "Clinic Health Center"
  },
  "insurance": {
    "payer_id": "PAYER-001",
    "member_id": "MEM123456",
    "group_id": "GRP789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fhir_claim_id": "Claim/clm-fhir-001",
    "resourceType": "Claim",
    "status": "active",
    "type": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "professional"
      }]
    },
    "created": "2025-10-30T10:24:00Z",
    "fhir_store_path": "projects/PROJECT/locations/us-central1/datasets/clinic-data/fhirStores/claims"
  }
}
```

**Cloud Services Called:**
- Google Healthcare API (FHIR Store)
- Cloud KMS (encrypt FHIR data)

---

### POST `/api/v1/edi/generate-837`

Generate EDI 837 Professional claim format.

**Request:**
```json
{
  "fhir_claim_id": "Claim/clm-fhir-001",
  "format": "837P",
  "payer_id": "PAYER-001",
  "clearinghouse": "Availity"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "edi_file_id": "edi_837_20251030_001",
    "gcs_path": "gs://clinic-claims/2025/10/837_001.txt",
    "format": "837P",
    "version": "005010X222A1",
    "segments_count": 42,
    "generated_at": "2025-10-30T10:25:00Z",
    "file_size": 4096
  }
}
```

---

## HITL Gate 3: Final Billing Review

### POST `/api/v1/hitl/billing/approve`

Billing specialist performs final compliance review.

**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "reviewer_id": "billing_456",
  "compliance_checks": {
    "documentation_complete": true,
    "codes_supported": true,
    "payer_requirements_met": true,
    "clean_claim": true
  },
  "approved_for_submission": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "reviewed_by": "Sarah Johnson",
    "reviewed_at": "2025-10-30T10:26:00Z",
    "next_stage": "external_submission",
    "audit_log_id": "audit_log_003"
  }
}
```

---

## Event Publishing (Pub/Sub)

### POST `/api/v1/pubsub/publish`

Publish claim events to Pub/Sub topics.

**Request:**
```json
{
  "topic": "claims-approved",
  "message": {
    "claim_id": "CLM-2025-10-30-001",
    "status": "approved",
    "timestamp": "2025-10-30T10:26:00Z",
    "metadata": {
      "patient_id": "PAT-2025-001",
      "provider_id": "PRV-12345"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "msg_pub123",
    "topic": "projects/PROJECT/topics/claims-approved",
    "published_at": "2025-10-30T10:26:05Z"
  }
}
```

**Cloud Services Called:**
- Cloud Pub/Sub (message broker)

---

## External Submission (Clearinghouse)

### POST `/api/v1/clearinghouse/submit`

Submit EDI 837 to external clearinghouse.

**Request:**
```json
{
  "edi_file_id": "edi_837_20251030_001",
  "clearinghouse": "Availity",
  "payer_id": "PAYER-001",
  "priority": "normal",
  "test_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission_id": "SUB-2025-10-30-001",
    "tracking_id": "CLM-2025-10-30-001",
    "clearinghouse": "Availity",
    "status": "submitted",
    "submitted_at": "2025-10-30T10:27:00Z",
    "estimated_response": "24-48 hours",
    "confirmation_number": "AVTY-2025-ABC123"
  }
}
```

---

### GET `/api/v1/clearinghouse/status/{submission_id}`

Check submission status and payer response.

**Response:**
```json
{
  "success": true,
  "data": {
    "submission_id": "SUB-2025-10-30-001",
    "status": "accepted",
    "payer_status": "under_review",
    "acknowledgment_received": true,
    "acknowledgment_code": "997",
    "last_updated": "2025-10-31T08:00:00Z",
    "estimated_payment_date": "2025-11-15"
  }
}
```

---

## Analytics (BigQuery)

### POST `/api/v1/analytics/store`

Store claim data in BigQuery for analytics.

**Request:**
```json
{
  "claim_id": "CLM-2025-10-30-001",
  "dataset": "claims_analytics",
  "table": "processed_claims",
  "data": {
    "claim_id": "CLM-2025-10-30-001",
    "patient_id": "PAT-2025-001",
    "provider_id": "PRV-12345",
    "diagnosis_code": "J20.9",
    "procedure_code": "99213",
    "submitted_date": "2025-10-30",
    "status": "submitted",
    "amount": 150.00
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rows_inserted": 1,
    "job_id": "bq_job_789",
    "dataset": "claims_analytics.processed_claims",
    "inserted_at": "2025-10-30T10:28:00Z"
  }
}
```

**Cloud Services Called:**
- BigQuery (data warehouse)
- Cloud KMS (encrypt data at rest)

---

## Audit & Compliance

### GET `/api/v1/audit/logs`

Query Cloud Audit Logs for compliance reporting.

**Request:**
```
GET /api/v1/audit/logs?resource_id=CLM-2025-10-30-001&start_date=2025-10-30&end_date=2025-10-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-10-30T10:15:30Z",
        "user": "usr_12345",
        "action": "claim.upload",
        "resource": "CLM-2025-10-30-001",
        "ip_address": "192.168.1.100",
        "result": "success"
      },
      {
        "timestamp": "2025-10-30T10:18:00Z",
        "user": "usr_12345",
        "action": "hitl.transcription.approve",
        "resource": "trans_456abc",
        "result": "success"
      }
    ],
    "total_count": 15
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_001` | Invalid authentication credentials |
| `AUTH_002` | Token expired |
| `AUTH_003` | MFA required |
| `PERM_001` | Insufficient permissions |
| `VAL_001` | Invalid input data |
| `VAL_002` | Code validation failed |
| `HITL_001` | Human review required |
| `AI_001` | AI model error |
| `FHIR_001` | FHIR resource creation failed |
| `EDI_001` | EDI generation failed |
| `CLEAR_001` | Clearinghouse submission failed |
| `RATE_001` | Rate limit exceeded |

---

## Workflow Summary

Here's the complete API call sequence for processing one claim:

1. **Authentication**: `POST /api/v1/auth/login`
2. **Upload**: `POST /api/v1/claims/upload`
3. **Transcribe**: `POST /api/v1/transcription/start` → `GET /api/v1/transcription/{job_id}`
4. **HITL Gate 1**: `POST /api/v1/hitl/transcription/approve`
5. **AI Extract**: `POST /api/v1/ai/extract-codes`
6. **Validate**: `GET /api/v1/codes/validate`
7. **HITL Gate 2**: `POST /api/v1/hitl/codes/approve`
8. **FHIR**: `POST /api/v1/fhir/create-claim`
9. **EDI**: `POST /api/v1/edi/generate-837`
10. **HITL Gate 3**: `POST /api/v1/hitl/billing/approve`
11. **Publish**: `POST /api/v1/pubsub/publish`
12. **Submit**: `POST /api/v1/clearinghouse/submit`
13. **Analytics**: `POST /api/v1/analytics/store`

**Total API Calls**: ~15-20 per claim (including status checks)

---

## Security Headers

All API responses include these security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/auth/login` | 5 | 15 minutes |
| `/api/v1/claims/upload` | 100 | 1 hour |
| All other endpoints | 1000 | 1 minute |

---

**Last Updated**: October 30, 2025  
**API Version**: v1.0.0  
**Status**: Production-Ready Architecture
