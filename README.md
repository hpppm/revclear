# RevClear

AI-assisted medical claims and speech transcription platform for secure healthcare billing workflows. Processes clinical encounter audio, generates SOAP notes via AI, and produces medical billing codes (ICD-10/CPT) — built for HIPAA-compliant environments.

---

## Quick Start

```bash
# Clone
git clone https://github.com/hpppm/revclear.git
cd revclear

# Backend (port 3005)
cd backend && npm install && cp .env.example .env && npm run dev

# Frontend (port 3000) — separate terminal
cd frontend && npm install && npm run dev
```

**Docker (full stack — dev, hot reload):**
```bash
docker-compose up
```

---

## Architecture

```
revclear/
├── backend/                    # Express + TypeScript API
│   ├── src/
│   │   ├── api/routes/         # REST endpoints
│   │   ├── config/             # AWS, database, app configuration
│   │   ├── middleware/         # auth, audit, error handling
│   │   ├── services/ai/        # speechToSoap, soapToCodes, modular providers
│   │   ├── db/                 # pg query layer
│   │   └── utils/              # crypto (PHI encryption), logger
│   ├── python/                 # Whisper transcription microservice (Flask)
│   └── tests/
│       ├── security/           # Security regression tests
│       └── integration/        # API contract tests
├── frontend/                   # Next.js App Router (Turbopack)
│   └── app/
│       ├── (pages)/            # Auth pages: landing, login, signup, forgot-password
│       ├── dashboard/          # Patients, encounters, claims, organization, profile
│       ├── components/         # UI primitives + encounter wizard
│       ├── context/            # AuthContext
│       └── lib/                # API clients, types, Zod validation schemas
└── .github/workflows/          # CI + Semgrep SAST
```

### Data Flow

```
Audio Upload → Cloud Storage → Whisper transcription
                                       ↓
                              speechToSoap (AI)
                                       ↓
                                   SOAP Note
                                       ↓
                              soapToCodes (AI)
                            (ICD-10 / CPT matching)
                                       ↓
                              Claim generation
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express, TypeScript, Node.js 20 |
| Frontend | Next.js (App Router, Turbopack), React, Tailwind CSS |
| Database | PostgreSQL via AWS RDS |
| Auth | AWS Cognito, httpOnly cookie JWTs |
| File storage | AWS S3 |
| AI inference | Ollama (local default) or configurable external endpoints |
| Transcription | faster-whisper (Python Flask microservice) |
| Validation | Zod (backend + frontend, dual-layer) |
| Logging | pino (structured JSON) |
| CI | GitHub Actions — Jest, TypeScript check, ESLint, npm audit, Semgrep SAST |

---

## Database

Core tables: `users`, `organizations`, `patients`, `encounters`, `claims`, `medical_codes`, `ai_results`, `audio_records`, `audit_log`, `ai_feedback`

- All queries scoped by organization — no cross-org data access
- Claims support CMS-1500 (professional) and UB-04 (institutional) formats
- PHI tables have audit triggers on every write operation

---

## API Routes

All routes under `/api`. Protected routes require authentication via httpOnly cookie.

### Auth (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/signup` | Register |
| POST | `/confirm-signup` | Confirm registration |
| POST | `/signin` | Login |
| POST | `/signout` | Logout |
| POST | `/refresh-token` | Rotate access token |
| POST | `/forgot-password` | Initiate password reset |
| POST | `/confirm-forgot-password` | Complete password reset |
| GET | `/me` | Current user |

### Organizations (`/api/organizations`)

| Method | Path | Description |
|---|---|---|
| GET | `/me` | Current org |
| POST | `/` | Create org |
| POST | `/join` | Join via invite code |
| POST | `/invite` | Generate invite (admin) |
| PATCH | `/me` | Update org settings |

### Users (`/api/users`) — admin only

| Method | Path | Description |
|---|---|---|
| GET | `/` | List users |
| GET | `/:id` | Get user |

### Patients (`/api/patients`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List patients |
| GET | `/:id` | Patient detail |
| POST | `/` | Create patient |
| PUT | `/:id` | Update patient |
| DELETE | `/:id` | Delete patient |
| GET | `/:id/subscriber` | Insurance subscriber |
| PUT | `/:id/subscriber` | Update subscriber |

### Encounters (`/api/encounters`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List encounters |
| GET | `/:id` | Encounter detail |
| POST | `/` | Create encounter |
| PUT | `/:id` | Update encounter |
| DELETE | `/:id` | Delete encounter |
| GET | `/:id/soap` | Get SOAP note |
| POST | `/:id/soap` | Generate SOAP note via AI |
| PUT | `/:id/soap` | Edit SOAP note |
| POST | `/:id/codes/match` | AI code matching |

### Claims (`/api/claims`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List claims |
| GET | `/:id` | Claim detail |
| POST | `/` | Create claim |
| PUT | `/:id` | Update claim |
| DELETE | `/:id` | Delete claim |
| GET | `/encounter/:id/preview` | Preview claim |

### Other

| Route | Description |
|---|---|
| `POST /api/transcribe` | Audio upload → transcription |
| `GET /api/transcribe/:encounterId` | Get transcript |
| `PUT /api/transcribe/:encounterId` | Edit transcript |
| `GET /api/codes/search` | Search ICD-10 / CPT |
| `GET /api/me` | User profile |
| `PATCH /api/me` | Update profile |
| `GET /api/health` | Health check |

---

## AI Provider System

Modular — swap providers without touching business logic. Two pipelines, each with a local and external option:

- **SOAP generation** — Ollama (local) or `SOAP_API_URL` (external)
- **Code matching** — local CPT dataset or `CODES_API_URL` (external)

Provider is selected at startup based on which env vars are set. No code changes required.

---

## Whisper Transcription Service

Standalone Python microservice:

```bash
cd backend/python
pip install -r ../requirements.txt
python whisper_server.py
```

| Env var | Default | Description |
|---|---|---|
| `PORT` | `5000` | Listen port |
| `WHISPER_MODEL` | `base` | Model size: `tiny` / `base` / `small` / `medium` / `large` |
| `WHISPER_DEVICE` | `cpu` | `cpu` or `cuda` |
| `WHISPER_COMPUTE_TYPE` | `int8` | Quantization |

Accepts: `.mp3 .mp4 .m4a .wav .webm .ogg .flac`

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
# AWS
AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_USER_POOL_ID=
AWS_CLIENT_ID=

# Database
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SSL=true

# AI inference
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
SOAP_API_URL=           # optional: external SOAP endpoint
CODES_API_URL=          # optional: external codes endpoint

# Security
PHI_ENCRYPTION_KEY=     # 32-byte hex string — AES-256-GCM
ALLOWED_ORIGINS=        # comma-separated allowed origins

# Whisper service
WHISPER_SERVER_URL=http://localhost:5000
```

Frontend: `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:3005/api`

---

## Development Commands

### Backend
```bash
cd backend
npm run dev        # hot reload
npm run build      # compile TypeScript
npm test           # Jest
npx tsc --noEmit   # type check only
```

### Frontend
```bash
cd frontend
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint
```

---

## Security

- PHI encrypted at rest (AES-256-GCM) — key never stored in DB
- Auth tokens in httpOnly + Secure + SameSite=Strict cookies
- Role-based access control — admin and clinician roles
- Organization-scoped queries — enforced at middleware level
- Parameterized queries throughout — no string interpolation in SQL
- Helmet security headers + CORS allow-list
- Audit log on all PHI table writes (PostgreSQL triggers)
- Rate limiting on all routes

### CI Security
- Semgrep SAST on every PR and push to main
- `npm audit --audit-level=high` on every run
- AWS OIDC — no long-lived credentials in CI

---

## Testing

```bash
cd backend
npm test                           # all tests
npx jest tests/security/           # security regression suite
npx jest tests/integration/        # API contract tests
```

Security test areas: RBAC enforcement, PHI encryption, rate limiting, JWT expiry, claim data integrity.

---

## CI / GitHub Actions

| Workflow | Trigger | What it checks |
|---|---|---|
| `ci.yml` | PR + push to main | TypeScript, Jest, ESLint, build, npm audit |
| `semgrep.yml` | PR, push to main, manual | SAST across TypeScript, Node.js, JWT, SQL injection, secrets rulesets |

---

## Compliance Baseline

| Framework | Controls Applied |
|---|---|
| HIPAA | PHI encryption at rest + in transit, audit logging, access controls |
| OWASP API Security Top 10 | Input validation, auth, rate limiting, error handling, injection prevention |

---

## License

MIT — see [LICENSE](LICENSE) for details.
