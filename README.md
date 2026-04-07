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
docker-compose up   # Backend :4000, Frontend :3000
```

**Docker (production):**
```bash
docker-compose -f docker-compose.prod.yml up   # nginx :80/:443, backend :3005, frontend :3000
```

---

## Architecture

```
revclear/
├── backend/                    # Express 4 + TypeScript 5 API
│   ├── src/
│   │   ├── api/routes/         # REST endpoints (auth, patients, encounters, claims, …)
│   │   ├── config/             # AWS, database, Swagger, app configuration
│   │   ├── middleware/         # auth, audit, security monitoring, error handling
│   │   ├── services/ai/        # speechToSoap, soapToCodes, modular provider adapters
│   │   │   └── providers/      # codeMatcher, soapGenerator (Ollama / external endpoints)
│   │   ├── db/                 # pg query layer, migration runners
│   │   └── utils/              # crypto (AES-256-GCM PHI), pino logger
│   ├── python/                 # Whisper transcription microservice (Flask + faster-whisper)
│   └── tests/
│       ├── security/           # Security regression tests (encryption, RBAC, rate limit)
│       └── integration/        # API contract tests
├── frontend/                   # Next.js 16 App Router (Turbopack)
│   └── app/
│       ├── (pages)/            # Auth pages: landing, login, signup, forgot-password
│       ├── dashboard/          # Patients, encounters, claims, organization, profile
│       ├── components/         # UI primitives + encounter wizard
│       ├── context/            # AuthContext (httpOnly cookie JWT)
│       ├── lib/api/            # Axios client modules mirroring backend routes
│       └── lib/validation/     # Zod schemas (dual-validated with backend)
├── deploy/nginx/               # Production nginx config (reverse proxy + TLS)
└── .github/workflows/          # CI (typecheck + test + build) + Semgrep SAST
```

### Data Flow

```
Audio Upload → S3 → Whisper microservice (Flask/faster-whisper, port 5000)
                              ↓
                     speechToSoap service
                      (Ollama / external)
                              ↓
                          SOAP Note
                              ↓
                     soapToCodes service
                    (ICD-10 / CPT matching)
                              ↓
                    Claim generation → EDI-ready output
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express 4.22, TypeScript 5, Node.js 20 |
| Frontend | Next.js 16.2 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| Database | PostgreSQL 17 via AWS RDS |
| Auth | AWS Cognito · `aws-jwt-verify` 4 · httpOnly cookie JWTs |
| File storage | AWS S3 (audio, transcripts) |
| AI inference | Ollama (local default) or external SOAP/codes endpoints (modular) |
| Transcription | faster-whisper (Python Flask microservice, port 5000) |
| Validation | Zod 3 (backend) + Zod 4 (frontend), dual-layer |
| Logging | pino 10 (structured JSON, PHI excluded) |
| API docs | Swagger UI at `/docs` (dev only) |
| CI | GitHub Actions — Jest, TypeScript check, ESLint, npm audit, Semgrep SAST |

---

## Database

Core tables: `users`, `organizations`, `patients`, `encounters`, `claims`, `medical_codes`, `ai_results`, `audio_records`, `audit_log`, `ai_feedback`

- Users belong to one organization; all queries scoped by `organization_id` + `clinician_id`
- Claims support **CMS-1500** (professional) and **UB-04** (institutional) formats
- All PHI tables have PostgreSQL audit triggers on INSERT / UPDATE / DELETE
- No `SELECT *` or `RETURNING *` — explicit column lists enforced throughout

---

## API Routes

All routes under `/api`. Protected routes require a valid Cognito JWT in an httpOnly cookie.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup` | — | Register new Cognito user |
| POST | `/confirm-signup` | — | Confirm registration code |
| POST | `/signin` | — | Login — sets httpOnly JWT cookie |
| POST | `/signout` | — | Clear auth cookies |
| POST | `/refresh-token` | — | Rotate access token |
| POST | `/forgot-password` | — | Initiate password reset |
| POST | `/confirm-forgot-password` | — | Complete password reset |
| GET | `/me` | ✓ | Current user profile |

### Organizations (`/api/organizations`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/me` | any | Current user's organization |
| POST | `/` | any | Create organization |
| POST | `/join` | any | Join organization |
| POST | `/invite` | admin | Invite user by email |
| PATCH | `/me` | any | Update organization settings |

### Users (`/api/users`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | admin | List all users |
| GET | `/:cognitoId` | admin | Get user by Cognito ID |

### Patients (`/api/patients`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List patients (org-scoped) |
| GET | `/:id` | Patient detail |
| POST | `/` | Create patient |
| PUT | `/:id` | Update patient |
| DELETE | `/:id` | Delete patient |
| GET | `/:id/subscriber` | Get insurance subscriber |
| PUT | `/:id/subscriber` | Update insurance subscriber |

### Encounters (`/api/encounters`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List encounters (org-scoped) |
| GET | `/:id` | Encounter detail |
| POST | `/` | Create encounter |
| PUT | `/:id` | Update encounter |
| DELETE | `/:id` | Delete encounter |
| GET | `/:id/soap` | Get SOAP note |
| POST | `/:id/soap` | Generate SOAP note via AI |
| PUT | `/:id/soap` | Update SOAP note |
| POST | `/:id/codes/match` | AI ICD-10/CPT code matching |

### Claims (`/api/claims`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List claims (org-scoped) |
| GET | `/:id` | Claim detail |
| POST | `/` | Create claim |
| PUT | `/:id` | Update claim |
| DELETE | `/:id` | Delete claim |
| GET | `/encounter/:encounterId/preview` | Preview claim for encounter |

### Profile (`/api/me`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Get current user profile |
| PATCH | `/` | Update current user profile |

### Other

| Route | Description |
|---|---|
| `POST /api/transcribe` | Audio upload (multipart/form-data) → S3 → Whisper |
| `GET /api/transcribe/audio/:encounterId` | Presigned S3 audio URL |
| `GET /api/transcribe/:encounterId` | Get transcript |
| `PUT /api/transcribe/:encounterId` | Update transcript |
| `GET /api/codes/search` | Search ICD-10 / CPT codes |
| `GET /api/security/stats` | Security monitoring stats (admin only) |
| `GET /api/health` | Health check |
| `GET /api/health/ai` | AI provider connectivity check (auth required) |

---

## AI Provider System

The AI layer is modular — swap providers without touching business logic:

```
services/ai/
├── speechToSoap.ts      # Orchestrates audio → SOAP pipeline
├── soapToCodes.ts       # Orchestrates SOAP → codes pipeline
├── mockTranscript.ts    # Dev mock for transcript bypass
├── providerHealth.ts    # Provider connectivity health check
└── providers/
    ├── soapGenerator.ts # SOAP generation: Ollama or SOAP_API_URL
    └── codeMatcher.ts   # Code matching: local CPT data or CODES_API_URL
```

Configure via environment variables — no code changes needed to switch providers.

---

## Whisper Transcription Service

Standalone Python microservice (`backend/python/whisper_server.py`):

```bash
cd backend/python
pip install -r ../requirements.txt
python whisper_server.py   # port 5000 (configurable via PORT env var)
```

| Env var | Default | Description |
|---|---|---|
| `PORT` | `5000` | HTTP listen port |
| `WHISPER_MODEL` | `base` | Model size: `tiny`, `base`, `small`, `medium`, `large` |
| `WHISPER_DEVICE` | `cpu` | `cpu` or `cuda` |
| `WHISPER_COMPUTE_TYPE` | `int8` | Quantization type |

Accepts: `.mp3 .mp4 .m4a .wav .webm .ogg .flac`  
Returns: `{ "transcript": "..." }`

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
# AWS
AWS_REGION=us-east-1
AWS_S3_BUCKET=                        # audio + transcript storage
AWS_USER_POOL_ID=
AWS_CLIENT_ID=

# Database (PostgreSQL via RDS)
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SSL=true
DB_SSL_CA=                             # RDS CA bundle (production)
DB_POOL_MAX=10

# AI inference
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
SOAP_API_URL=                          # optional: external SOAP endpoint
CODES_API_URL=                         # optional: external codes endpoint

# Security
PHI_ENCRYPTION_KEY=                    # 32-byte hex (64 chars) — AES-256-GCM
ALLOWED_ORIGINS=                       # comma-separated (dev defaults to localhost)

# Whisper microservice
WHISPER_SERVER_URL=http://localhost:5000

# External AI endpoints (production — leave unset to use local Ollama)
AI_SERVER_API_KEY=                     # shared key for SOAP + codes external endpoints
AI_TRANSCRIBE_URL=                     # optional: external transcription endpoint
```

Frontend: `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:3005/api`

---

## Development Commands

### Backend
```bash
cd backend
npm run dev        # nodemon + ts-node (hot reload, port 3005)
npm run build      # compile TypeScript → dist/
npm test           # Jest
npx tsc --noEmit   # type check
```

### Frontend
```bash
cd frontend
npm run dev        # Next.js + Turbopack (port 3000)
npm run build      # production build
npm run lint       # ESLint
```

### Whisper (Python)
```bash
cd backend/python
python whisper_server.py   # port 5000
```

---

## Security

### HIPAA Controls
- PHI encrypted at rest with **AES-256-GCM** (`backend/src/utils/crypto.ts`) — IV + auth tag stored alongside ciphertext
- RDS SSL/TLS enforced in all environments; strict cert verification in production
- No PHI in application logs — pino structured logger, PHI fields excluded by design
- PostgreSQL audit triggers on every PHI table (INSERT / UPDATE / DELETE)

### Authentication & Authorization
- AWS Cognito issues JWT access tokens; backend verifies with `aws-jwt-verify`
- Tokens stored in **httpOnly + Secure + SameSite=Strict cookies** — not localStorage
- RBAC via Cognito groups → application roles:

| Cognito Group | Role | Access |
|---|---|---|
| `Admin` | `admin` | Full — users, org settings, security stats |
| `Users` | `clinician` | Standard — patients, encounters, claims, transcription |
| (none) | `clinician` | Default fallback |

- All data queries gated by `requireOrganization` middleware — no cross-org data access

### API Security
- Rate limiting on all routes (`express-rate-limit`, IP-based; proxy trust configured for production)
- Helmet security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
- CORS locked to explicit allow-list: `revclear.gannon.edu`, `revclear.tech` (prod) / localhost (dev)
- Zod schema validation on all inputs — generic error messages surface to clients
- SQL injection prevention: parameterized queries throughout, no string interpolation
- Security monitoring middleware detects brute force, SQLi, and XSS patterns at runtime

### CI Security
- **Semgrep SAST** on every PR and push to main (`p/typescript p/nodejs p/jwt p/sql-injection p/secrets`)
- `npm audit --audit-level=high` on every CI run (backend + frontend)
- AWS OIDC identity verification on merge to main

---

## Testing

```bash
cd backend

npm test                                        # all tests
npx jest tests/security/                        # security regression suite
npx jest tests/integration/                     # API contract tests
npx jest tests/specific.test.ts --runInBand     # single file
```

**Security test coverage:**
- `admin-role-enforcement` — RBAC boundary tests
- `ai-results-encryption` — PHI encryption at rest
- `claim-snapshot-encryption` — claim data encryption
- `phi-mixed-mode-helpers` — mixed PHI field handling
- `rate-limit-and-token-expiry` — rate limit + JWT expiry
- `security-fixes` — regression suite for patched CVEs

---

## CI / GitHub Actions

| Workflow | Trigger | Checks |
|---|---|---|
| `ci.yml` | PR + push to main | TypeScript check, Jest, ESLint, npm audit (backend + frontend build) |
| `semgrep.yml` | PR, push to main, `workflow_dispatch` | SAST (170 rules across 5 rulesets) |

AWS OIDC identity verification runs after CI passes on main-branch pushes only.

---

## Production Deployment

Production stack (`docker-compose.prod.yml`):

```
nginx 1.27 (reverse proxy, TLS termination)
  ├── → frontend :3000 (Next.js)
  └── → backend  :3005 (Express)
```

- TLS via Let's Encrypt — cert paths injected via `NGINX_CERT_FULLCHAIN` / `NGINX_CERT_PRIVKEY` env vars
- All secrets injected at container runtime via environment — no secrets baked into images
- `trust proxy 1` enabled in production for correct client IP behind nginx
- External `shared-ai` Docker network connects backend to the AI inference stack (Whisper + SOAP + codes services)

---

## Compliance Baseline

| Framework | Controls Applied |
|---|---|
| HIPAA | PHI encryption at rest + in transit, audit logging, access controls, minimum necessary |
| OWASP API Security Top 10 | Input validation, auth, rate limiting, error handling, least privilege, injection prevention |

---

## License

MIT — see [LICENSE](LICENSE) for details.
