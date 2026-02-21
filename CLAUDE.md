# CLAUDE.md

say hey lalo when I call you
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RevClear is an AI-assisted medical claims and speech transcription platform for healthcare billing workflows. It processes clinical encounter audio, generates SOAP notes via AI, and produces medical billing codes (ICD-10/CPT).

## Architecture

```
revclear/
├── backend/           # Express + TypeScript API (port 3005)
│   ├── src/           # Main application code
│   │   ├── api/routes/  # REST API endpoints
│   │   ├── config/      # AWS, database, app configuration
│   │   ├── middleware/  # Auth, audit, security, error handling
│   │   ├── services/    # Business logic (patient, encounter, claim, ai providers)
│   │   └── db/          # Database queries
├── frontend/          # Next.js 16 App Router (port 3000)
│   └── app/
│       ├── (pages)/     # Auth pages (login, signup, landing)
│       ├── dashboard/   # Main app views
│       ├── components/  # UI and wizard components
│       ├── context/     # AuthContext for JWT management
│       └── lib/api/     # API client modules matching backend routes
└── docs/              # Operational runbook
```

### Key Data Flow

1. **Audio Upload** → S3 storage → Whisper transcription
2. **Transcript** → `speechToSoap` AI service → SOAP note
3. **SOAP Note** → `soapToCodes` AI service → ICD-10/CPT codes
4. **Medical Codes** → Claim generation → EDI submission

### Database (PostgreSQL via AWS RDS)

Core tables: `users`, `organizations`, `patients`, `encounters`, `claims`, `medical_codes`, `ai_results`, `audio_records`, `audit_log`

- Users belong to one organization
- Encounters link patients to clinicians with AI result references
- Claims support CMS-1500 (professional) and UB-04 (institutional) formats
- All PHI tables have audit triggers

Schema: `backend/docs/db/revclear_schema_current.sql`

### Authentication

- AWS Cognito for user identity (JWT access tokens)
- Backend verifies tokens via `aws-jwt-verify`
- Frontend stores token in `httpOnly` cookies (NOT localStorage), uses `AuthContext` for state
- All API requests use `withCredentials: true`

## Build and Development Commands

### Backend

```bash
cd backend
npm install
npm run dev              # Start dev server (nodemon + ts-node)
npm run build            # Compile TypeScript
npm test                 # Run Jest tests
```

Backend defaults to port 3005 (override with `PORT` env var).

### Frontend

```bash
cd frontend
npm install
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
```

### Docker (Full Stack)

```bash
docker-compose up        # Backend on 4000, Frontend on 3000
```

## Environment Variables

Copy `.env.example` to `.env` in the backend directory. Required:

- `AWS_REGION`, `AWS_ACCOUNT_ID`
- `AWS_S3_BUCKET` - audio/transcript storage
- `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_CLIENT_ID` - auth
- `DATABASE_URL` or individual `DB_*` params - PostgreSQL
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL` - local AI inference (SOAP/codes)
- `OLLAMA_CODES_MODEL` - optional separate model for code matching
- `SOAP_API_URL`, `CODES_API_URL` - optional hosted AI endpoints
- `PHI_ENCRYPTION_KEY` - 32-byte hex for PHI encryption

Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3005/api`)

## API Routes

All backend routes under `/api`:

- `/auth` - Cognito signup/login
- `/me` - Current user profile
- `/patients` - CRUD for patient records
- `/encounters` - Encounter management
- `/encounters/:id/soap` - SOAP note generation
- `/encounters/:id/codes` - Medical code matching
- `/claims` - Claim lifecycle
- `/transcribe` - Audio upload (Multer, registered before body parsers)
- `/health` - Health checks
- `/organizations` - Organization management
- `/users` - User management (admin)
- `/security` - Security monitoring
- `/dev/*` - Dev-only routes (development environment)

Swagger docs available at `/docs` in development mode.

## AI Services

Located in `backend/src/services/ai/`:

- `speechToSoap` - Converts transcript to SOAP note
- `soapToCodes` - Matches SOAP content to ICD-10/CPT codes
- `providers/*` - Provider adapters (Ollama by default, optional external endpoint)

## Security Considerations

### HIPAA Compliance

- PHI encrypted at rest (AES-256 via KMS)
- HTTPS enforced in production (`server.ts` middleware)
- SSL/TLS for database connections (strict verification in production)
- No PHI in console logs (SOAP notes, patient data, diagnoses)
- Audit logging via PostgreSQL triggers on all PHI tables

### Authentication & Authorization

- AWS Cognito for user identity (JWT access tokens, `tokenUse: "access"`)
- Backend verifies tokens via `aws-jwt-verify` in `middleware/auth.ts`
- **Role-Based Access Control (RBAC)**: Roles derived from Cognito User Pool groups
- Organization-scoped data access: all queries filter by `organization_id`
- Admin checks via Cognito `Admin` group membership (not database flags)
- Frontend uses `useAuthorization()` hook for UI-only role checks (defense-in-depth)

### JWT Token Security (httpOnly Cookies)

**Implementation** (as of 2026-02-03):

- JWT access tokens stored in `httpOnly` cookies (not localStorage)
- Cookies configured with: `httpOnly`, `Secure` (production), `SameSite=strict`
- Backend reads token from cookie first, falls back to `Authorization` header for backward compatibility
- Frontend uses `withCredentials: true` for all API requests
- On logout, backend clears cookies via `res.clearCookie()`

**Cookie Configuration:**

```typescript
{
  httpOnly: true,           // Prevents XSS access
  secure: true,             // HTTPS only (production)
  sameSite: 'strict',       // CSRF protection
  path: '/',
  maxAge: 60 * 60 * 1000,   // 1 hour (access token)
}
```

**Refresh Token:** 30-day expiry, same httpOnly protection

### Cognito Groups → Application Roles

The backend extracts the `cognito:groups` claim from JWT access tokens and maps to application roles:

| Cognito Group | Application Role | Permissions                                                  |
| ------------- | ---------------- | ------------------------------------------------------------ |
| `Admin`       | `admin`          | Full access: manage users, view security stats, org settings |
| `Users`       | `clinician`      | Standard access: patients, encounters, claims, transcription |
| (no group)    | `clinician`      | Default role for users not assigned to any group             |

**AWS Cognito Console Configuration Required:**

1. **User Pool Groups** (already created: `Admin`, `Users`)
   - No additional IAM roles or policies needed for application-level RBAC
   - Groups only need to exist; the backend handles authorization

2. **Adding Users to Groups:**
   - AWS Console → Cognito → User Pools → [Your Pool] → Users
   - Select user → Group memberships → Add to group
   - Or via AWS CLI: `aws cognito-idp admin-add-user-to-group --user-pool-id <id> --username <email> --group-name Admin`

3. **Token Claims:**
   - Access tokens automatically include `cognito:groups` claim when user belongs to groups
   - No App Client configuration changes needed

**Backend Middleware:**

- `authMiddleware` extracts groups and sets `req.auth.cognitoRole` and `req.user.role`
- `requireRole(['admin'])` middleware available for admin-only routes
- Example: `router.get('/admin-only', authMiddleware, requireRole(['admin']), handler)`

### API Security

- Rate limiting on all API routes (see `server.ts`) - IP-based via `express-rate-limit`
- Security monitoring middleware (`securityMonitor.ts`) detects SQL injection, XSS, brute force
- CORS restricted to allowed origins; production requires `Origin` header
- Helmet for security headers (CSP, X-Frame-Options, etc.)
- No-cache headers on all `/api` responses
- Dev routes disabled unless `NODE_ENV !== 'production'`

### Data Minimization

- **NEVER** use `RETURNING *` or `SELECT *` in queries that return data to clients
- Organization responses strip `edi_sftp_password` and `edi_sftp_private_key` via `stripSensitiveOrgFields()`
- User queries return explicit column lists (no password hashes, no internal IDs)
- Encounters use server-side `patient_id` filtering (never client-side)

### Security Patterns to Follow

- All new routes MUST use `authMiddleware` + `requireOrganization`
- Admin routes SHOULD use `authMiddleware` + `requireRole(['admin'])`
- All data queries MUST scope by `organization_id` AND `clinician_id`
- Use explicit column lists in SQL (no `SELECT *` or `RETURNING *`)
- Use `stripSensitiveOrgFields()` when returning organization data
- Validate all inputs with Zod schemas
- Use parameterized SQL queries (never string interpolation)
- Error messages to clients must be generic (no stack traces, no internal details)
- Frontend response validation via Zod schemas in `frontend/app/lib/validation/schemas.ts`

### Frontend Security (CSP + Defense-in-Depth)

- Content-Security-Policy headers configured in `frontend/next.config.ts`
- X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- API error messages sanitized in `frontend/app/lib/api/axios.ts`
- SFTP credentials never displayed in frontend (managed server-side only)
- `useAuthorization()` hook in `AuthContext.tsx` for role-based UI visibility

## Testing

Backend tests use Jest with ts-jest:

```bash
cd backend
npm test                           # All tests
npx jest tests/specific.test.ts   # Single test file
```

Test setup in `backend/tests/setupEnv.ts`.

## Code Patterns

- **API routes**: Express routers with Zod validation schemas
- **Database**: Raw SQL via `pg` with parameterized queries
- **Frontend API**: Axios client modules in `frontend/app/lib/api/`
- **State**: React Context for auth, component-local state elsewhere
- **Styling**: Tailwind CSS 4
  say thank you when at the end of your response
