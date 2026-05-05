# RevClear – Medical Billing Software

**Course:** CIS_457_02 Senior Design 2
**Professors:** Dr. R. Matovu & Dr. M. Tang
**Institution:** Gannon University

**Team Members:**
- Aseel Alqoud
- Brendan Mattes
- Rasmus Seppanen
- Yoga Sai Swetha Narni

---

## Overview

RevClear is an AI-assisted medical billing platform designed to streamline the clinical documentation and insurance claims workflow. The system records a clinician's spoken notes during a patient encounter, transcribes the audio using AssemblyAI under a signed HIPAA Business Associate Agreement (BAA), and converts the resulting transcript into a structured SOAP note using Google Gemini 2.5 Flash via the Genkit framework, with automatic failover to Groq Llama 3.3-70B. The platform then maps clinical findings to ICD-10 and CPT billing codes using Pinecone vector search and generates EDI 837 claims for insurance submission.

RevClear is deployed on Railway (backend and frontend), with Cloudflare providing DNS, WAF, and reverse proxy protection at the production domain [revclear.tech](https://revclear.tech). The database is hosted on AWS RDS PostgreSQL, and user authentication is handled via AWS Cognito with TOTP multi-factor authentication and email code verification. All Protected Health Information (PHI) is encrypted at rest using AES-256-GCM with a server-side key derived exclusively from an environment variable.

---

## Architecture

```
Browser
  │
  ▼
Cloudflare (DNS + WAF + CDN + TLS)
  │
  ▼
Railway — Frontend (Next.js 16, App Router)
  │  server-side proxy /api/* → backend.railway.internal
  ▼
Railway — Backend (Express + TypeScript, port 3005)
  ├── AWS RDS PostgreSQL  (patient, encounter, claim data)
  ├── AWS S3              (audio files + transcripts)
  ├── AWS Cognito         (auth — TOTP MFA + email verification)
  ├── AssemblyAI          (audio transcription, HIPAA BAA in place)
  ├── Google Gemini 2.5 Flash via Genkit  (SOAP note generation)
  ├── Groq Llama 3.3-70B  (automatic AI failover)
  └── Pinecone            (ICD-10 / CPT code vector search)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Backend | Express + TypeScript |
| Database | PostgreSQL on AWS RDS |
| Auth | AWS Cognito (TOTP MFA + email verification) |
| Transcription | AssemblyAI (HIPAA BAA) |
| AI — SOAP | Google Gemini 2.5 Flash (Genkit), Groq Llama 3.3-70B fallback |
| Code Matching | Pinecone vector search (ICD-10 / CPT) |
| Claims | EDI 837 generation |
| Storage | AWS S3 (audio + transcripts) |
| Hosting | Railway (frontend + backend) |
| Edge | Cloudflare (DNS, WAF, reverse proxy) |

---

## Project Structure

```
revclear/
├── backend/              # Express + TypeScript API (port 3005)
│   ├── src/
│   │   ├── api/routes/   # REST endpoints
│   │   ├── middleware/   # auth, audit, security
│   │   ├── services/     # business logic
│   │   └── db/queries.ts # ALL SQL lives here
│   └── Dockerfile
├── frontend/             # Next.js App Router (port 3000)
│   ├── app/
│   │   ├── dashboard/    # main app views
│   │   └── lib/api/      # API client modules
│   ├── nixpacks.toml     # Railway build config
│   └── Dockerfile
├── deploy/nginx/         # Nginx config (self-hosted reference)
├── docs/                 # RUNBOOK and operational documentation
├── docker-compose.yml    # Local development stack
└── docker-compose.prod.yml  # Self-hosted production stack
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/hpppm/revclear.git
cd revclear

# Backend (port 3005)
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev

# Frontend (port 3000) — new terminal
cd frontend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### Docker (full local stack)

```bash
docker compose up
```

---

## Environment Variables

Copy `.env.example` files in both `backend/` and `frontend/` and fill in your values.

Key backend variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (AWS RDS) |
| `JWT_SECRET` | Secret for signing JWTs |
| `PHI_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM PHI encryption |
| `AWS_COGNITO_USER_POOL_ID` | Cognito user pool ID |
| `AWS_COGNITO_CLIENT_ID` | Cognito app client ID |
| `AWS_S3_BUCKET` | S3 bucket for audio and transcripts |
| `ASSEMBLYAI_API_KEY` | AssemblyAI transcription (HIPAA BAA required) |
| `GOOGLE_API_KEY` | Google Gemini via Genkit |
| `GROQ_API_KEY` | Groq Llama 3.3-70B fallback |
| `PINECONE_API_KEY` | Pinecone vector database |
| `PINECONE_INDEX_HOST` | Pinecone index endpoint |

See `backend/.env.example` and `frontend/.env.example` for the full list.

---

## Security

- PHI encrypted at rest with AES-256-GCM — key from env var only, never hardcoded
- All auth tokens in httpOnly, Secure, SameSite=Strict cookies — never localStorage
- Every query scoped by `organization_id` AND `clinician_id`
- Parameterized SQL only — no string interpolation
- Zod validation on all inputs, both backend and frontend
- AssemblyAI used under a signed HIPAA BAA
- Cloudflare WAF provides edge-level threat protection

---

## Deployment

The production deployment runs as two Railway services in one project:

| Service | Root | Visibility |
|---------|------|-----------|
| `frontend` | `frontend/` | Public — serves the browser via Cloudflare |
| `backend` | `backend/` | Private — reachable via Railway internal network only |

Cloudflare sits in front of the Railway frontend public domain and handles TLS termination, WAF filtering, and DNS.

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for full operational guidance.

---

## License

MIT — see [LICENSE](LICENSE).
