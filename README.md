# RevClear

AI-assisted medical claims platform. Audio → SOAP notes → ICD-10/CPT codes → billing claims.

---

## Quick Start

```bash
# Backend (port 3005)
cd backend && npm install && npm run dev

# Frontend (port 3000) — separate terminal
cd frontend && npm install && npm run dev
```

---

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Backend  | Express + TypeScript                      |
| Frontend | Next.js 16 App Router                     |
| Database | PostgreSQL (AWS RDS)                      |
| Auth     | AWS Cognito + Resend (OTP email)          |
| AI       | Whisper + Groq + Gemini + Pinecone        |
| Deploy   | Railway                                   |

---

## Project Structure

```
revclear/
├── backend/
│   ├── src/api/routes/     REST endpoints
│   ├── src/middleware/     auth, audit, security
│   ├── src/services/       business logic
│   ├── src/db/queries.ts   ALL SQL (never inline)
│   └── docs/db/            migration SQL files
├── frontend/
│   ├── app/dashboard/      main app views
│   ├── app/lib/api/        API client modules
│   └── app/lib/validation/ Zod schemas
└── handoffs/               per-feature implementation docs
```

---

## Auth Flow

**Signup:** email → OTP email verification → TOTP setup → dashboard

**Signin:** email + password → email_verified check → TOTP challenge → dashboard

**Session:** 8h absolute timeout · 30min idle timeout · one concurrent session per user · token rotation on every refresh

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `PHI_ENCRYPTION_KEY` | 64-char hex — encrypts all PHI at rest |
| `SESSION_SECRET` | 32+ char random string — signs session cookie |
| `RESEND_API_KEY` | Sends OTP emails |
| `AWS_USER_POOL_ID` | Cognito user pool |
| `AWS_CLIENT_ID` | Cognito app client |
| `AWS_REGION` | `us-east-1` |
| `DB_HOST` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | PostgreSQL |
| `GROQ_API_KEY` | Groq LLM |
| `GEMINI_API_KEY` | Gemini primary AI |
| `PINECONE_API_KEY` / `PINECONE_INDEX_HOST` | Vector search |
| `AWS_S3_BUCKET` | Audio + transcript storage |

---

## Security

- **HIPAA** — PHI encrypted at rest via `crypto.ts` (AES-256-GCM), never logged
- **RBAC** — admin / clinician / nurse / billing_staff / receptionist roles enforced at middleware
- **JWT** — httpOnly cookies only, never localStorage
- **Token rotation** — `GetTokensFromRefreshTokenCommand`, old refresh token invalidated immediately
- **Dual-scope queries** — every PHI query filters by `organization_id` AND `clinician_id`
- **MFA** — TOTP required on every login

---

## Commands

```bash
cd backend && npm test          # run test suite
cd backend && npm run build     # typecheck + compile
cd frontend && npm run lint     # lint
cd frontend && npx playwright test  # e2e tests
```

---

## License

MIT — see [LICENSE](LICENSE)
