<div align="center">

# 🏥 RevClear

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=2E9EF7&center=true&vCenter=true&width=600&lines=AI-Assisted+Medical+Billing+Platform;Audio+%E2%86%92+SOAP+%E2%86%92+ICD-10%2FCPT+%E2%86%92+EDI+837+Claims;HIPAA-Compliant+%7C+Railway+%7C+Cloudflare;Senior+Design+2+%E2%80%94+Gannon+University)](https://git.io/typing-svg)

[![Live](https://img.shields.io/badge/Live-revclear.tech-2E9EF7?style=for-the-badge&logo=firefox-browser&logoColor=white)](https://revclear.tech)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![HIPAA](https://img.shields.io/badge/HIPAA-Compliant-red?style=for-the-badge&logo=shield&logoColor=white)](https://revclear.tech)
[![Status](https://img.shields.io/badge/Status-Active%20Development-yellow?style=for-the-badge)](https://github.com/hpppm/revclear)

</div>

---

## 📋 Course Information

| Field | Detail |
|-------|--------|
| **Course** | CIS_457_02 — Senior Design 2 |
| **Professors** | Dr. R. Matovu & Dr. M. Tang |
| **Institution** | Gannon University |
| **Semester** | Spring 2026 |

**Team Members:**

<p align="center">
  Aseel Alqoud &nbsp;•&nbsp; Brendan Mattes &nbsp;•&nbsp; Rasmus Seppanen &nbsp;•&nbsp; Yoga Sai Swetha Narni
</p>

---

## 🧭 Overview

RevClear is an AI-assisted medical billing platform designed to streamline the clinical documentation and insurance claims workflow. The system records a clinician's spoken notes during a patient encounter, transcribes the audio using **AssemblyAI** under a signed HIPAA Business Associate Agreement (BAA), and converts the resulting transcript into a structured SOAP note using **Google Gemini 2.5 Flash** via the Genkit framework, with automatic failover to **Groq Llama 3.3-70B**. The platform then maps clinical findings to ICD-10 and CPT billing codes using **Pinecone** vector search and generates **EDI 837** claims for insurance submission.

RevClear is deployed on **Railway** (backend and frontend), with **Cloudflare** providing DNS, WAF, and reverse proxy protection at the production domain [revclear.tech](https://revclear.tech). The database is hosted on **AWS RDS PostgreSQL**, and user authentication is handled via **AWS Cognito** with TOTP multi-factor authentication and email code verification. All Protected Health Information (PHI) is encrypted at rest using **AES-256-GCM** with a server-side key derived exclusively from an environment variable.

---

## 🚀 Tech Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)

### Backend
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=node.js&logoColor=white)

### AI & Transcription
![AssemblyAI](https://img.shields.io/badge/AssemblyAI-FF6B6B?style=flat-square&logo=microphone&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini_2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_Llama_3.3--70B-F54E27?style=flat-square&logo=meta&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=flat-square&logo=pinecone&logoColor=white)

### Infrastructure & Cloud
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![AWS](https://img.shields.io/badge/Amazon_AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

### Security & Auth
![Cognito](https://img.shields.io/badge/AWS_Cognito_MFA-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)
![HIPAA](https://img.shields.io/badge/HIPAA-BAA_in_place-green?style=flat-square)
![AES](https://img.shields.io/badge/AES--256--GCM-PHI_Encrypted-green?style=flat-square)

</div>

---

## 🏗️ Architecture

```
Browser
  │
  ▼
Cloudflare  (DNS · WAF · CDN · TLS termination)
  │
  ▼
Railway — Frontend  (Next.js 16, App Router — public)
  │  server-side proxy  /api/*  →  backend.railway.internal
  ▼
Railway — Backend  (Express + TypeScript, port 3005 — private)
  ├── AWS RDS PostgreSQL   patient · encounter · claim data
  ├── AWS S3               audio files + encrypted transcripts
  ├── AWS Cognito          TOTP MFA + email verification
  ├── AssemblyAI           audio transcription  (HIPAA BAA)
  ├── Genkit → Gemini 2.5 Flash   SOAP note generation
  ├── Groq Llama 3.3-70B          automatic AI failover
  └── Pinecone             ICD-10 / CPT code vector search
```

> The browser never reaches the backend directly. All API traffic is proxied server-side through the frontend service over Railway's private internal network.

---

## ✨ Key Features

<details open>
<summary><b>🎙️ Audio Transcription</b></summary>
<br>

- Clinician records spoken patient encounter notes
- Audio uploaded to AWS S3 (KMS-encrypted)
- Transcribed via **AssemblyAI** under a signed HIPAA BAA
- Fallback error handling if transcription service is unavailable

</details>

<details open>
<summary><b>📝 SOAP Note Generation</b></summary>
<br>

- Transcript sent to **Google Gemini 2.5 Flash** via the Genkit framework
- Automatically structured into Subjective / Objective / Assessment / Plan format
- Automatic failover to **Groq Llama 3.3-70B** on provider error
- SOAP notes stored encrypted at rest (AES-256-GCM)

</details>

<details open>
<summary><b>🔍 Medical Code Matching</b></summary>
<br>

- Clinical findings semantically matched to **ICD-10** and **CPT** codes
- Powered by **Pinecone** vector search with medical embeddings
- Async job pattern prevents gateway timeouts on large code sets
- Clinician reviews and confirms suggested codes

</details>

<details open>
<summary><b>📄 Claims Generation</b></summary>
<br>

- Confirmed codes assembled into **EDI 837** claim format
- Full billing workflow: patient → encounter → codes → claim
- Claims stored per organization and clinician with dual-scoped access control

</details>

<details open>
<summary><b>🔐 Security & Compliance</b></summary>
<br>

- **HIPAA-aligned**: audit logging, PHI encryption, BAA with AssemblyAI
- **AWS Cognito**: TOTP MFA + email verification, token rotation on refresh, 1-hour access token expiry
- **PHI encrypted at rest**: AES-256-GCM, key from env var only — never hardcoded
- **httpOnly cookies**: JWT tokens never touch localStorage
- **Dual-scoped queries**: every PHI query filters by `organization_id` AND `clinician_id`
- **Parameterized SQL**: no string interpolation — ever
- **Zod validation**: all inputs validated on both backend and frontend
- **Cloudflare WAF**: edge-level threat and bot protection
- **Semgrep + npm audit** in CI for static analysis and dependency scanning

</details>

---

## 🗂️ Project Structure

```
revclear/
├── backend/                  # Express + TypeScript API (port 3005)
│   ├── src/
│   │   ├── api/routes/       # REST endpoints
│   │   ├── middleware/       # auth, audit, rate limiting, security
│   │   ├── services/         # business logic (AI, claims, encounters)
│   │   └── db/queries.ts     # ALL SQL lives here — parameterized only
│   └── Dockerfile
├── frontend/                 # Next.js 16 App Router (port 3000)
│   ├── app/
│   │   ├── dashboard/        # main app views
│   │   └── lib/api/          # API client modules
│   ├── nixpacks.toml         # Railway build config
│   └── Dockerfile
├── deploy/nginx/             # Nginx config (self-hosted reference only)
├── docs/                     # RUNBOOK and operational documentation
├── docker-compose.yml        # Local development full-stack
└── docker-compose.prod.yml   # Self-hosted production stack (Nginx + TLS)
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 20+
- Docker (optional, for full local stack)
- Accounts: AWS (RDS + S3 + Cognito), AssemblyAI, Google AI, Groq, Pinecone

### Local Development

```bash
# 1. Clone
git clone https://github.com/hpppm/revclear.git
cd revclear

# 2. Backend (port 3005)
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev

# 3. Frontend (port 3000) — new terminal
cd frontend
cp .env.example .env        # fill in your values
npm install
npm run dev
```

### Docker (full local stack)

```bash
docker compose up
```

---

## 🔑 Environment Variables

Copy `.env.example` in both `backend/` and `frontend/` and fill in your values.

<details>
<summary><b>Key Backend Variables</b></summary>
<br>

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

See `backend/.env.example` for the full list.

</details>

---

## 🚢 Deployment

### Railway (Production)

Two Railway services in one project:

| Service | Root | Visibility |
|---------|------|-----------|
| `frontend` | `frontend/` | Public — proxied through Cloudflare |
| `backend` | `backend/` | Private — Railway internal network only |

Key Railway env vars:
- **Frontend:** `NEXT_PUBLIC_API_URL=/api` · `BACKEND_INTERNAL_URL=http://backend.railway.internal:3005/api`
- **Backend:** `AI_TRANSCRIBE_URL=...` · `GEMINI_API_KEY=...` · `PINECONE_API_KEY=...`

### Cloudflare

- DNS points to the Railway frontend public domain
- Cloudflare handles TLS termination — no certs needed on Railway
- WAF rules provide edge-level protection

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for full operational guidance.

---

## 🧪 Testing

```bash
# Backend unit + integration tests
cd backend && npm test

# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npm run lint

# E2E (Playwright)
cd frontend && npx playwright test

# Security audit
cd backend && npm audit --audit-level=high
cd frontend && npm audit --audit-level=high
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for security requirements, commit conventions, and PR guidelines.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  <i>"Healthcare data deserves the highest standard of protection."</i>
  <br><br>
  <a href="https://revclear.tech">🏥 revclear.tech</a> &nbsp;•&nbsp;
  <a href="docs/RUNBOOK.md">📖 Runbook</a> &nbsp;•&nbsp;
  <a href="CONTRIBUTING.md">🤝 Contributing</a>
</div>
