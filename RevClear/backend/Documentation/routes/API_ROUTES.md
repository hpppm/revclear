# 🌐 API Routes V2

## Developer Reference — REST API for AI-Powered Medical Billing System

**(Cloud Run + Firebase Auth + Genkit Integration)**

### ⚙️ 1. Overview

All routes are hosted under your Cloud Run service, secured with Firebase Auth (Identity Platform) JWTs.
Each request is logged in Cloud Logging with PHI audit metadata.

**Base URL (Production):**

`https://api-medbill-[REGION].run.app/api`

**Auth Header:**

`Authorization: Bearer <Firebase_ID_Token>`

---

### 🧩 2. Route Categories

| #   | Category       | Base Path        | Description                         |
| --- | -------------- | ---------------- | ----------------------------------- |
| 1   | Authentication | `/auth`          | Firebase Auth integration endpoints |
| 2   | Patients       | `/patients`      | Manage patient demographics         |
| 3   | Encounters     | `/encounters`    | SOAP notes, AI integrations         |
| 4   | AI             | `/ai`            | Genkit + Vertex AI processing flows |
| 5   | Claims         | `/claims`        | Insurance claim management          |
| 6   | Feedback       | `/feedback`      | Claim feedback + AI retraining      |
| 7   | Notifications  | `/notifications` | User alerts & events                |
| 8   | Utility        | `/test`          | Health checks                       |

---

### 🔐 3. Authentication Routes

**Base:** `/api/auth`

| Method | Endpoint    | Description                             | Auth Required |
| ------ | ----------- | --------------------------------------- | :-----------: |
| `POST` | `/register` | Register clinician via Firebase Auth    |      ❌       |
| `POST` | `/login`    | Sign in via Firebase Auth               |      ❌       |
| `GET`  | `/me`       | Returns current Firebase Auth user info |      ✅       |
| `POST` | `/logout`   | Log out current session                 |      ✅       |

**Example — `GET /api/auth/me`**

`GET /api/auth/me`
`Authorization: Bearer eyJhbGciOi...`

**Response**

```json
{
  "user": {
    "uid": "00000000-0000-0000-0000-000000000001",
    "email": "dr.jane@example.com",
    "role": "clinician"
  }
}
```

---

### 👩‍⚕️ 4. Patient Routes

**Base:** `/api/patients`

| Method   | Endpoint      | Description                           | Auth Required |
| -------- | ------------- | ------------------------------------- | :-----------: |
| `GET`    | `/`           | List patients for logged-in clinician |      ✅       |
| `POST`   | `/`           | Create a new patient                  |      ✅       |
| `GET`    | `/:patientId` | Retrieve patient details              |      ✅       |
| `PUT`    | `/:patientId` | Update patient info                   |      ✅       |
| `DELETE` | `/:patientId` | Delete patient                        |      ✅       |

**Example — Create Patient**

`POST /api/patients`
`Authorization: Bearer <token>`
`Content-Type: application/json`

```json
{
  "full_name": "John Smith",
  "dob": "1985-03-22",
  "gender": "male",
  "phone": "+1 555-123-4567",
  "email": "john.smith@example.com",
  "insurance_provider": "Blue Cross Blue Shield",
  "insurance_policy_number": "BCBS-908273"
}
```

**Response**

```json
{
  "id": "uuid",
  "message": "Patient created successfully"
}
```

---

### 🩺 5. Encounter Routes

**Base:** `/api/encounters`

| Method   | Endpoint                   | Description                    | Auth Required |
| -------- | -------------------------- | ------------------------------ | :-----------: |
| `POST`   | `/`                        | Start a new encounter          |      ✅       |
| `GET`    | `/`                        | List encounters for clinician  |      ✅       |
| `GET`    | `/:encounterId`            | Retrieve encounter details     |      ✅       |
| `PUT`    | `/:encounterId`            | Update SOAP data               |      ✅       |
| `DELETE` | `/:encounterId`            | Delete encounter               |      ✅       |
| `POST`   | `/:encounterId/audio`      | Upload encounter audio         |      ✅       |
| `GET`    | `/:encounterId/ai-results` | Fetch Genkit/Vertex AI outputs |      ✅       |

**Example — Start Encounter**

```json
{
  "patient_id": "uuid",
  "date_of_service": "2025-10-23T15:00:00Z"
}
```

**Response**

```json
{
  "encounter_id": "uuid",
  "status": "draft",
  "message": "Encounter started"
}
```

---

### 🤖 6. AI Routes (Genkit + Vertex AI Integration)

**Base:** `/api/ai`

| Method | Endpoint            | Description                   | Triggers                       |
| ------ | ------------------- | ----------------------------- | ------------------------------ |
| `POST` | `/transcribe`       | Convert uploaded audio → text | Cloud Function → Vertex Speech |
| `POST` | `/generate-soap`    | Transcript → SOAP note JSON   | Cloud Function → Vertex Gemini |
| `POST` | `/extract-codes`    | SOAP → ICD-10/CPT             | Cloud Function → Vertex Gemini |
| `POST` | `/generate-claim`   | Codes → Claim JSON            | Cloud Function                 |
| `POST` | `/analyze-feedback` | Claim results → AI feedback   | Cloud Function                 |

**Example — Generate SOAP**

`POST /api/ai/generate-soap`
`Authorization: Bearer <token>`
`Content-Type: application/json`

```json
{
  "encounter_id": "uuid",
  "transcript": "Patient reports mild cough and fatigue for three days..."
}
```

**Response**

```json
{
  "soap": {
    "subjective": "Mild cough and fatigue",
    "objective": "Vitals stable, lungs clear",
    "assessment": "Viral upper respiratory infection",
    "plan": "Rest, fluids, OTC medication"
  },
  "confidence": 0.93
}
```

---

### 💼 7. Claims Routes

**Base:** `/api/claims`

| Method | Endpoint           | Description                               | Auth Required |
| ------ | ------------------ | ----------------------------------------- | :-----------: |
| `GET`  | `/`                | List all claims for clinician             |      ✅       |
| `POST` | `/`                | Create claim from encounter (AI-assisted) |      ✅       |
| `GET`  | `/:claimId`        | Retrieve claim details                    |      ✅       |
| `PUT`  | `/:claimId/submit` | Mark claim as submitted                   |      ✅       |
| `PUT`  | `/:claimId/status` | Update claim status                       |      ✅       |

**Example — Create Claim**

```json
{
  "encounter_id": "uuid",
  "diagnosis_codes": ["J06.9"],
  "procedure_codes": ["99213"],
  "insurance_provider": "Blue Cross Blue Shield",
  "total_amount": 120.0
}
```

**Response**

```json
{
  "claim_id": "uuid",
  "status": "ready",
  "message": "Claim generated successfully"
}
```

---

### 🧠 8. Feedback Routes

**Base:** `/api/feedback`

| Method | Endpoint | Description                           | Auth Required |
| ------ | -------- | ------------------------------------- | :-----------: |
| `POST` | `/`      | Submit AI feedback for rejected claim |      ✅       |
| `GET`  | `/`      | List feedback history                 |      ✅       |

**Example — Submit Feedback**

```json
{
  "claim_id": "uuid",
  "encounter_id": "uuid",
  "ai_codes": { "icd": ["J06.9"], "cpt": ["99213"] },
  "final_codes": { "icd": ["J06.9"], "cpt": ["99214"] },
  "status": "rejected",
  "rejection_reason": "Insufficient documentation for Level 4 visit"
}
```

**Response**

```json
{ "message": "Feedback recorded successfully" }
```

---

### 🔔 9. Notification Routes

**Base:** `/api/notifications`

| Method   | Endpoint                | Description                    | Auth Required |
| -------- | ----------------------- | ------------------------------ | :-----------: |
| `GET`    | `/`                     | Get all notifications for user |      ✅       |
| `PUT`    | `/:notificationId/read` | Mark notification as read      |      ✅       |
| `DELETE` | `/:notificationId`      | Delete notification            |      ✅       |

**Response**

```json
[
  {
    "id": "uuid",
    "title": "Claim Ready",
    "message": "A new claim for John Smith is ready for submission.",
    "type": "info",
    "is_read": false,
    "created_at": "2025-10-23T15:00:00Z"
  }
]
```

---

### 🧰 10. Utility Routes

**Base:** `/api/test`

| Method | Endpoint | Description                              |
| ------ | -------- | ---------------------------------------- |
| `GET`  | `/`      | API + Cloud SQL + Vertex AI health check |

**Response**

```json
{
  "success": true,
  "message": "Cloud Run + SQL + Vertex AI connection healthy"
}
```

---

### 🧩 11. AI Flow Integration Map

| API Endpoint           | Cloud Function            | Vertex AI Model | Output             |
| ---------------------- | ------------------------- | --------------- | ------------------ |
| `/ai/transcribe`       | `transcribeAudio.flow.ts` | Speech-to-Text  | Transcript         |
| `/ai/generate-soap`    | `generateSOAP.flow.ts`    | Gemini          | SOAP JSON          |
| `/ai/extract-codes`    | `extractCodes.flow.ts`    | Gemini          | ICD/CPT Codes      |
| `/ai/generate-claim`   | `generateClaim.flow.ts`   | N/A             | Claim JSON         |
| `/ai/analyze-feedback` | `analyzeFeedback.flow.ts` | Gemini          | Tuning Suggestions |

---

### 📋 12. Response & Error Format

| Type          | Field                      | Description                 |
| ------------- | -------------------------- | --------------------------- |
| ✅ Success    | `message`                  | Human-readable confirmation |
| ⚠️ Validation | `error`                    | Input or permission issue   |
| 🔢 Data       | `data`                     | Structured payload          |
| ⏱️ Timestamps | `created_at`, `updated_at` | ISO 8601 UTC                |

---

### 🔒 13. Security Notes

- All API calls must include a valid Firebase Auth JWT.
- API runs behind a VPC + Cloud Armor ingress.
- Sensitive data (PHI) is never returned in plaintext logs.
- Cloud Logging retains all API audit events for 6 years.

---

### 🧠 14. Typical Workflow

```mermaid
graph TD
    A[Clinician Login → Firebase Auth] --> B[Create Patient → /patients]
    B --> C[Start Encounter → /encounters]
    C --> D[Upload Audio → /encounters/:id/audio]
    D --> E[/ai/transcribe → Transcript]
    E --> F[/ai/generate-soap → SOAP Note]
    F --> G[/ai/extract-codes → ICD/CPT Codes]
    G --> H[/claims → Claim JSON]
    H --> I[/feedback → AI Retraining]
    I --> J[/notifications → Status Updates]
```

---

### ✅ 15. Deployment Notes

- The entire API is deployed via **Cloud Run**:

  ```bash
  gcloud run deploy api-backend \
    --image=gcr.io/$PROJECT_ID/medical-backend:latest \
    --region=us-central1 \
    --service-account=api-backend@$PROJECT_ID.iam.gserviceaccount.com \
    --vpc-connector=hipaa-vpc-connector \
    --allow-unauthenticated=false
  ```

- AI routes forward requests to **Cloud Functions**:

  ```bash
  gcloud functions deploy generateSOAP --runtime=nodejs22 --region=us-central1 \
    --entry-point=generateSOAP --trigger-http --no-allow-unauthenticated
  ```

- Both Cloud Run and Functions run inside a **VPC Service Perimeter**.

That completes your API_ROUTES_V2.md — a fully developer-ready reference aligned with the Cloud SQL schema, Genkit AI flows, and Firebase Auth integration.

---

```md
#### 🧱 Local / Free-Tier Deployment (Option B)

During early development, the API can run on:

- **Vercel / Railway / Render** using the same Express entry point
- Database via Supabase connection string
- `.env` credentials instead of Secret Manager

All routes and JSON formats remain identical.
```
