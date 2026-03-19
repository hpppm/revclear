# RevClear

AI-assisted medical claims and speech transcription platform for secure healthcare billing workflows. Processes clinical encounter audio, generates SOAP notes via AI, and produces medical billing codes (ICD-10/CPT).

---

## Quick Start

```bash
# Clone
git clone https://github.com/hpppm/revclear.git
cd revclear

# Backend (port 3005)
cd backend && npm install && cp .env.example .env && npm run dev

# Frontend (port 3000) — in a separate terminal
cd frontend && npm install && npm run dev
```

**Docker (full stack):**
```bash
docker-compose up   # Backend on :4000, Frontend on :3000
```

---

## Architecture

```
revclear/
├── backend/                    # Express + TypeScript API (port 3005)
│   ├── src/
│   │   ├── api/routes/         # REST endpoints (auth, patients, encounters, claims…)
│   │   ├── config/             # AWS, database, app configuration
│   │   ├── middleware/         # Auth, audit, security, error handling
│   │   ├── services/ai/        # speechToSoap, soapToCodes, provider adapters
│   │   └── utils/              # crypto (AES-256-GCM PHI), logger (pino)
│   ├── tests/
│   │   ├── security/           # Security regression tests
│   │   └── integration/        # API contract tests
│   └── docs/db/                # PostgreSQL schema + migrations
├── frontend/                   # Next.js 16 App Router (port 3000)
│   └── app/
│       ├── (pages)/            # Auth pages: login, signup, landing
│       ├── dashboard/          # Patients, encounters, claims, profile
│       ├── components/         # UI primitives + encounter wizard
│       ├── context/            # AuthContext (httpOnly cookie JWT)
│       └── lib/api/            # Axios client modules mirroring backend routes
├── terraform/                  # AWS infrastructure as code
├── docs/                       # Runbooks and workflow guides
└── .github/workflows/          # CI, semgrep security scan
```

### Data Flow

```
Audio Upload → S3 → Whisper transcription
                         ↓
                   speechToSoap (Ollama / external endpoint)
                         ↓
                      SOAP Note
                         ↓
                   soapToCodes (ICD-10 / CPT matching)
                         ↓
                   Claim generation → EDI submission
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express 4, TypeScript 5, Node.js |
| Frontend | Next.js 16.2 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| Database | PostgreSQL 17 via AWS RDS |
| Auth | AWS Cognito (JWT access tokens, httpOnly cookies) |
| File storage | AWS S3 (audio, transcripts) |
| AI inference | Ollama (local, default) or external SOAP/codes endpoints |
| Validation | Zod (backend + frontend dual-validation) |
| Logging | pino (structured JSON) |
| CI | GitHub Actions — Jest, TypeScript check, Semgrep SAST |

---

## Database

Core tables: `users`, `organizations`, `patients`, `encounters`, `claims`, `medical_codes`, `ai_results`, `audio_records`, `audit_log`, `ai_feedback`

- Users belong to one organization; all queries scoped by `organization_id` + `clinician_id`
- Claims support **CMS-1500** (professional) and **UB-04** (institutional) formats
- All PHI tables have PostgreSQL audit triggers
- Full schema: [backend/docs/db/revclear_schema_current.sql](backend/docs/db/revclear_schema_current.sql)

---

## API Routes

All routes under `/api`:

| Route | Description |
|---|---|
| `POST /auth/signup` | Cognito user registration |
| `POST /auth/login` | Login — sets httpOnly JWT cookie |
| `POST /auth/logout` | Clears auth cookies |
| `GET /me` | Current user profile |
| `GET/POST /patients` | Patient CRUD |
| `GET/POST /encounters` | Encounter management |
| `POST /encounters/:id/soap` | AI SOAP note generation |
| `POST /encounters/:id/codes` | AI ICD-10/CPT code matching |
| `GET/POST /claims` | Claim lifecycle |
| `POST /transcribe` | Audio upload (multipart) |
| `GET /health` | Health check |
| `GET/POST /organizations` | Organization management |
| `GET /users` | User management (admin only) |
| `GET /security` | Security monitoring stats (admin only) |

Swagger UI available at `/docs` in development.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
# AWS
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=
AWS_S3_BUCKET=                        # audio + transcript storage
AWS_COGNITO_USER_POOL_ID=
AWS_COGNITO_CLIENT_ID=

# Database (PostgreSQL via RDS)
DATABASE_URL=                          # or use individual DB_* vars
DB_HOST=
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_SSL_CA=                             # optional: RDS CA bundle (production)

# AI inference
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_CODES_MODEL=                    # optional: separate model for code matching
SOAP_API_URL=                          # optional: external SOAP endpoint
CODES_API_URL=                         # optional: external codes endpoint

# Security
PHI_ENCRYPTION_KEY=                    # 32-byte hex (64 hex chars) for AES-256-GCM
ALLOWED_ORIGINS=                       # comma-separated (defaults to localhost in dev)
```

Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3005/api`)

---

## Development Commands

### Backend
```bash
cd backend
npm run dev        # nodemon + ts-node (hot reload)
npm run build      # compile TypeScript
npm test           # Jest (runs all tests in backend/tests/)
npx tsc --noEmit   # type check without emitting
```

### Frontend
```bash
cd frontend
npm run dev        # Next.js dev server with Turbopack
npm run build      # production build
npm run lint       # ESLint
```

---

## Security

### HIPAA Controls
- PHI encrypted at rest with **AES-256-GCM** (`backend/src/utils/crypto.ts`) — IV + auth tag stored with ciphertext
- RDS SSL/TLS enforced in all environments; strict cert verification in production
- No PHI in application logs (pino structured logger, PHI fields excluded)
- Audit triggers on all PHI tables log every INSERT/UPDATE/DELETE

### Authentication & Authorization
- AWS Cognito issues JWT access tokens; backend verifies with `aws-jwt-verify`
- Tokens stored in **httpOnly + Secure + SameSite=strict cookies** (not localStorage)
- RBAC via Cognito groups → application roles:

| Cognito Group | Role | Access |
|---|---|---|
| `Admin` | `admin` | Full access — users, security stats, org settings |
| `Users` | `clinician` | Standard — patients, encounters, claims, transcription |
| (none) | `clinician` | Default fallback |

### API Security
- Rate limiting on all routes (`express-rate-limit`, IP-based)
- Helmet security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- CORS restricted to explicit allow-list; production requires `Origin` header
- Zod schema validation on all inputs; generic error messages to clients
- SQL injection prevention: parameterized queries only, no string interpolation
- `SELECT *` and `RETURNING *` prohibited — explicit column lists everywhere
- Security monitoring middleware detects brute force, SQLi, XSS patterns

### CI Security
- **Semgrep SAST** runs on every PR and push to main (`p/typescript p/nodejs p/jwt p/sql-injection p/secrets`)
- `workflow_dispatch` available for on-demand branch scans

---

## Testing

```bash
cd backend

npm test                                        # all tests
npx jest tests/security/                        # security tests only
npx jest tests/integration/                     # API contract tests
npx jest tests/specific.test.ts --runInBand     # single file
```

Test setup: `backend/tests/setupEnv.ts`

---

## CI / GitHub Actions

| Workflow | Trigger | Checks |
|---|---|---|
| `ci.yml` | PR + push to main | TypeScript, Jest, AWS identity |
| `semgrep.yml` | PR, push to main, `workflow_dispatch` | SAST (170 rules) |

---

## Compliance Baseline

| Framework | Controls Applied |
|---|---|
| HIPAA | PHI encryption at rest + in transit, audit logging, access controls |
| NIST CSF | Protect, Detect, Respond, Recover across system lifecycle |
| OWASP API Security | Input validation, auth, rate limiting, error handling, least privilege |

---

## License

MIT — see [LICENSE](LICENSE) for details.
