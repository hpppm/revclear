# ☁️ Google Cloud Backend Overview

## Developer Guide — AI-Powered Medical Billing Backend (Google Cloud Architecture)

### 🩺 1. Purpose

This document describes the technical architecture, deployment process, and service interactions for the AI-Powered Medical Billing System, fully migrated to Google Cloud Platform (GCP) under HIPAA compliance.

It is written for developers and DevOps engineers who maintain or deploy the backend infrastructure.

---

### 🧩 2. Architecture Overview

#### 🏗️ Stack Summary

| Layer                | Technology                           | Purpose                                             |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| **API Layer**        | Cloud Run (Node.js + Express)        | RESTful API gateway                                 |
| **Database Layer**   | Cloud SQL (PostgreSQL 14+)           | Core PHI and relational data                        |
| **Storage Layer**    | Cloud Storage                        | Encrypted object storage (audio, PDFs, transcripts) |
| **AI Layer**         | Genkit + Vertex AI + Cloud Functions | Transcription, SOAP generation, ICD/CPT extraction  |
| **Auth Layer**       | Firebase Auth (Identity Platform)    | HIPAA-covered authentication and JWT issuance       |
| **Secrets & Config** | Secret Manager                       | Credential storage and environment variables        |
| **Logging & Audit**  | Cloud Logging + Cloud Audit Logs     | Centralized, immutable event logging                |
| **Networking**       | VPC + Private Service Connect        | Encrypted internal traffic only                     |

#### 🧱 Component Interaction

```mermaid
graph TD
    A[Frontend (Next.js)] -->|JWT| B[Cloud Run API]
    B -->|SQL Client + IAM| C[Cloud SQL (Postgres)]
    B -->|Upload File| D[Cloud Storage]
    B -->|Trigger Flow| E[Cloud Function (Genkit Flow)]
    E -->|Vertex AI Calls| F[Vertex AI]
    E -->|Results| C
    B -->|Log PHI event| G[Cloud Logging]
    B -->|Auth| H[Firebase Auth]
```

---

### ⚙️ 3. Core Responsibilities by Layer

#### 3.1 API Layer (Cloud Run)

- Hosts Express.js backend (TypeScript)
- Handles REST endpoints under `/api/*`
- Verifies JWTs from Firebase Auth
- Routes AI requests to Genkit Cloud Functions
- Logs all PHI-related operations via Cloud Logging

**Key Configuration**

```bash
gcloud run deploy api-backend \
  --image=gcr.io/$PROJECT_ID/medical-backend:latest \
  --service-account=api-backend@$PROJECT_ID.iam.gserviceaccount.com \
  --vpc-connector=hipaa-vpc-connector \
  --region=us-central1 \
  --ingress=internal-and-cloud-load-balancing \
  --allow-unauthenticated=false
```

#### 3.2 Database Layer (Cloud SQL - PostgreSQL)

- Stores all structured data: `users`, `patients`, `encounters`, `claims`, `ai_logs`.
- Uses SSL connections and private IP (no public endpoint).
- Enforced access via IAM and service accounts only.

**Connection String (Node.js)**

```javascript
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: "/cloudsql/YOUR_PROJECT:us-central1:medical-db",
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
});
```

**GCP Setup**

```bash
gcloud sql users create api_backend --instance=medical-db --password=securepass
gcloud sql databases create medical
```

#### 3.3 Storage Layer (Cloud Storage)

- Stores audio recordings, transcripts, and claim PDFs.
- Enforced encryption using Customer-Managed Encryption Keys (CMEK).
- All objects versioned and access-controlled via IAM.

**Usage Example**

```javascript
const file = bucket.file(`audio/${encounterId}.wav`);
await file.save(buffer, { metadata: { contentType: "audio/wav" } });
```

#### 3.4 AI Layer (Genkit + Vertex AI)

The AI engine runs via Genkit flows hosted as Cloud Functions.

| Function                  | Description                           | Model                    |
| ------------------------- | ------------------------------------- | ------------------------ |
| `transcribeAudio.flow.ts` | Converts uploaded audio to transcript | Vertex AI Speech-to-Text |
| `generateSOAP.flow.ts`    | Generates SOAP note JSON              | Vertex AI Gemini         |
| `extractCodes.flow.ts`    | Extracts ICD-10/CPT codes             | Vertex AI Gemini         |
| `generateClaim.flow.ts`   | Creates claim JSON from codes         | Custom Genkit logic      |
| `analyzeFeedback.flow.ts` | AI feedback learning                  | Vertex AI Gemini         |

**Example Cloud Function Deployment**

```bash
gcloud functions deploy generateSOAP \
  --runtime=nodejs22 \
  --region=us-central1 \
  --entry-point=generateSOAP \
  --service-account=ai-functions@$PROJECT_ID.iam.gserviceaccount.com \
  --vpc-connector=hipaa-vpc-connector \
  --trigger-http \
  --no-allow-unauthenticated
```

#### 3.5 Authentication Layer (Firebase Auth)

- Handles clinician login, registration, and JWT generation.
- Firebase Admin SDK verifies tokens in backend.
- All PHI requests require a valid `Bearer` token.

**Middleware**

```javascript
import { auth } from "../config/firebaseAdmin";

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  const decoded = await auth.verifyIdToken(token);
  req.user = decoded;
  next();
};
```

#### 3.6 Logging & Auditing

- Every create/read/update/delete (CRUD) action on PHI is logged to Cloud Logging.
- Logs retained for 6 years via policy:

```bash
gcloud logging buckets update \_Default --retention-days=2190
```

- Optional: enable Cloud Audit Logs for IAM and API access events.

---

### 🧰 4. Local Development Setup

**Prerequisites**

- Node.js 20+
- `gcloud` CLI authenticated
- Firebase Admin credentials
- Docker (for local Cloud SQL proxy)

**Run Locally**

1.  **Start SQL proxy:**

    ```bash
    gcloud sql connect medical-db --user=api_backend
    ```

2.  **Run development server:**

    ```bash
    npm install
    npm run dev
    ```

**Environment Variables (local `.env`):**

```
DB_USER=api_backend
DB_PASS=securepass
DB_NAME=medical
FIREBASE_PROJECT_ID=my-medical-app
GCP_PROJECT_ID=my-medical-app
```

---

### 🚀 5. CI/CD Deployment (Cloud Build)

`cloudbuild.yaml`

```yaml
steps:
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-t", "gcr.io/$PROJECT_ID/medical-backend:latest", "."]

  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "gcr.io/$PROJECT_ID/medical-backend:latest"]

  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      [
        "run",
        "deploy",
        "api-backend",
        "--image=gcr.io/$PROJECT_ID/medical-backend:latest",
        "--region=us-central1",
        "--service-account=api-backend@$PROJECT_ID.iam.gserviceaccount.com",
        "--allow-unauthenticated=false",
      ]
    timeout: "900s"
```

**Trigger:** GitHub push to `main` branch.

---

### 🔒 6. Security Model

| Layer              | Control              | Enforcement                      |
| ------------------ | -------------------- | -------------------------------- |
| **Network**        | VPC Service Controls | Restricts data exfiltration      |
| **Authentication** | Firebase Auth JWTs   | Validated on every API call      |
| **Encryption**     | Cloud KMS + CMEK     | End-to-end encryption            |
| **Access Control** | IAM + Roles          | Principle of least privilege     |
| **Secrets**        | Secret Manager       | Only service accounts can access |
| **Audit Logs**     | Cloud Logging        | Immutable and retained 6 years   |

---

### 🧩 7. Monitoring & Reliability

- **Cloud Monitoring:** Dashboard for API latency, error rate, and function usage.
- **Alerting:** Configured for 5xx errors or unauthorized attempts.
- **Error Reporting:** Automatically enabled via Cloud Run integration.

**Example:**

```bash
gcloud alpha monitoring policies create \
  --notification-channels=email@domain.com \
  --condition-display-name="API 5xx Rate High" \
  --condition-filter='metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'
```

---

### 📊 8. Data Flow Summary

| Step | Operation                      | Service                                |
| ---- | ------------------------------ | -------------------------------------- |
| 1    | Clinician logs in              | Firebase Auth                          |
| 2    | Creates patient record         | Cloud Run → Cloud SQL                  |
| 3    | Uploads encounter audio        | Cloud Run → Cloud Storage              |
| 4    | Backend triggers transcription | Cloud Run → Cloud Function → Vertex AI |
| 5    | SOAP + codes generated         | Cloud Function → Cloud SQL             |
| 6    | Claim prepared and reviewed    | Cloud Run                              |
| 7    | Audit entry logged             | Cloud Logging                          |
| 8    | Clinician notified             | Firebase Messaging (optional)          |

---

### ✅ 9. Summary

This backend architecture:

- Runs entirely inside BAA-covered Google Cloud services
- Separates API, AI, and data storage layers for scalability and compliance
- Uses Firebase Auth for native GCP identity
- Logs every PHI event with Cloud Logging
- Supports full CI/CD via Cloud Build + Cloud Run

### 10. Local & Free-Tier Development Setup (Option B)

For prototyping and education, the entire backend can run on free-tier or local services
while keeping the same schema and API contracts.

| Component      | Free / Local Equivalent                         | Notes                          |
| -------------- | ----------------------------------------------- | ------------------------------ |
| Cloud SQL      | **Supabase** or local **PostgreSQL via Docker** | Same schema and sample data    |
| Cloud Run      | **Vercel**, **Railway**, or **Render**          | Hosts Express API              |
| Cloud Storage  | **Supabase Storage** or **local MinIO**         | For audio / transcript objects |
| Vertex AI      | **Gemini API (Google AI Studio)**               | Free quota for model calls     |
| Firebase Auth  | Firebase free tier                              | Same authentication flow       |
| Secret Manager | `.env` files (dotenv)                           | Only for development           |
| Cloud Logging  | Local console / Winston logs                    | No PHI stored                  |

**⚠️ HIPAA Note:**  
This configuration is for development only.  
Production deployments must use HIPAA-covered GCP services (Cloud Run + Cloud SQL + Vertex AI under BAA).
