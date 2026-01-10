# RevClear Architecture Overview

## System Architecture

RevClear is a multi-tenant healthcare platform built on AWS infrastructure with a modern JavaScript/TypeScript stack.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Next.js Frontend │  │ Testing Dashboard │  │   Demo (Static)  │          │
│  │    (port 3000)    │  │   (port 3000)     │  │   GitHub Pages   │          │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘          │
└───────────┼─────────────────────┼───────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Express.js Backend (port 3005)                     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Middleware: CORS → Helmet → Rate Limit → Auth → Audit → Routes      │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Routes: /auth /patients /encounters /claims /transcribe /soap       │   │
│  │          /organizations /me /users /health /security                  │   │
│  └────────┬─────────────────────────────────────────────────────────────┘   │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICES LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ authService│ │patientSvc  │ │encounterSvc│ │ claimSvc   │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ AWS Cognito  │  │   AWS RDS    │  │    AWS S3    │  │  Genkit AI   │    │
│  │   (Auth)     │  │ (PostgreSQL) │  │   (Files)    │  │  (Gemini)    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                         ┌──────────────┐    │
│                                                         │   Whisper    │    │
│                                                         │   (Local)    │    │
│                                                         └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Audio Transcription Flow
```
[Audio File] → POST /api/transcribe → [S3 Upload] → [Whisper] → [ai_results]
                                                         │
                                                         ▼
                                              [transcript stored]
```

### SOAP Note Generation Flow
```
[Transcript] → POST /api/soap/generate → [Genkit/Gemini] → [ai_results]
                                                │
                                                ▼
                                      [SOAP note stored]
```

### Claims Generation Flow
```
[SOAP Note] → POST /api/codes/match → [ICD-10/CPT Lookup] → [Claim Created]
                                              │
                                              ▼
                                    [claims table entry]
```

---

## Database Schema (Simplified)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │     users       │       │    patients     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ organization_id │       │ id (PK)         │
│ name            │       │ id (PK)         │       │ organization_id │
│ billing_profile │       │ email           │       │ mrn             │
└─────────────────┘       │ role            │       │ name (encrypted)│
                          └─────────────────┘       └────────┬────────┘
                                                             │
                          ┌─────────────────┐                │
                          │   encounters    │◄───────────────┘
                          ├─────────────────┤
                          │ id (PK)         │
                          │ patient_id (FK) │
                          │ provider_id     │
                          │ status          │
                          └────────┬────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ audio_records │        │   ai_results    │        │     claims      │
├───────────────┤        ├─────────────────┤        ├─────────────────┤
│ id (PK)       │        │ id (PK)         │        │ id (PK)         │
│ encounter_id  │        │ encounter_id    │        │ encounter_id    │
│ s3_key        │        │ flow_name       │        │ status          │
│ duration      │        │ result (JSONB)  │        │ icd_codes       │
└───────────────┘        └─────────────────┘        │ cpt_codes       │
                                                    └─────────────────┘
```

---

## Multi-Tenancy Model

All data is scoped by `organization_id`:

- **Users** belong to exactly one organization
- **Patients** belong to one organization
- **Encounters/Claims** inherit organization from patient
- **API queries** automatically filter by authenticated user's organization

```typescript
// Example: All patient queries are scoped
const patients = await db.query(
  'SELECT * FROM patients WHERE organization_id = $1',
  [req.user.organization_id]
);
```

---

## Security Layers

### 1. Authentication (AWS Cognito)
- JWT tokens issued on login
- Tokens verified on every API request
- Refresh token rotation

### 2. Authorization (RBAC)
- Role-based access control per organization
- Roles: admin, provider, billing, readonly

### 3. Data Protection
- PHI encrypted at rest (AES-256-GCM)
- TLS 1.3 in transit
- S3 server-side encryption

### 4. API Security
- Rate limiting per endpoint
- Input validation (Zod schemas)
- SQL injection prevention (parameterized queries)
- Security headers (Helmet.js)

---

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Frontend** | User interface, audio recording, SOAP review |
| **Backend** | API gateway, business logic, orchestration |
| **Genkit** | AI flow orchestration (speech→SOAP, SOAP→codes) |
| **Whisper** | Local speech-to-text transcription |
| **Cognito** | User authentication, token management |
| **RDS** | Persistent data storage (patients, encounters, claims) |
| **S3** | File storage (audio files, transcripts) |

---

## Environment Configuration

### Development
- Backend: `http://localhost:3005`
- Frontend: `http://localhost:3000`
- Genkit UI: `http://localhost:4001` (via Docker)

### Docker Compose
- Backend: port 4000
- Genkit: port 4001
- Frontend: port 3000

### Production (AWS)
- API Gateway → Lambda/ECS
- CloudFront → S3 (static assets)
- RDS (Multi-AZ PostgreSQL)

---

## Related Documentation

- [Backend API Docs](../../backend/docs/BACKEND_REVCLEAR_v1.1.0.md)
- [Data Security](../../backend/docs/DATA_SECURITY.md)
- [Database Schema](../../backend/docs/db/revclear_schema_current.sql)
- [Terraform Infrastructure](../../terraform/)
