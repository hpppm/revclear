---
name: revclear
description: Coding patterns extracted from the RevClear healthcare billing platform (analyzed 200 commits, updated 2026-03-18)
metadata:
  version: 1.1.0
  source: local-git-analysis
  analyzed_commits: 200
  updated: 2026-03-18
---

# RevClear — Team Coding Patterns & Conventions

## 1. Commit Message Conventions

### Format
```
<type>(<scope>): <description>
```

**Types observed (frequency order):** `fix`, `feat`, `refactor`, `chore`, `ci`, `docs`, `test`, `perf`

**Scope patterns:**
- Backend route scope: `fix(auth):`, `feat(transcribe):`, `feat(audit):`
- GitHub issue scope: `feat(gh-116):`, `feat(gh-117):`, `refactor(gh-119):` — used when work is tied to a tracked issue
- Frontend scope: `fix(signup):`, `fix(layout):`
- Infrastructure scope: `ci:`, `chore(deps):`

**Rules observed:**
- Description is lowercase after the colon
- No period at end of description
- Body used sparingly — only when the change needs context that won't fit in the subject line
- Merge commits follow GitHub's default format: `Merge pull request #NNN from hpppm/<branch>`
- Some early commits are informal (single word, WIP labels) — this pattern was cleaned up by 2026-01

**Good examples from history:**
```
fix: update refresh token validity to 7 days to align with Cognito settings and add a test
feat(gh-118): encrypt persisted claim snapshots with mixed-mode reads
refactor(gh-119): share mixed-mode PHI decryption helpers and rollout docs
feat(audit): enhance logging for HIPAA compliance and mask sensitive data
fix(auth): prevent returning raw tokens in response and enhance security measures
```

---

## 2. Branch Naming Conventions

Pattern: `<category>/<short-description>` or `<category>-<short-description>`

| Category prefix | Purpose |
|---|---|
| `feature/` | New capabilities |
| `fix/` | Bug fixes |
| `ui/` | Frontend-only visual changes |
| `security/` | Security hardening |
| `ci/` | CI/CD workflow changes |
| `deployment/` | Docker / infra / proxy config |
| `chore/` | Maintenance, dependency bumps |
| `test/` | Testing-only branches |

Examples: `security/phi-encryption`, `fix/ai-server`, `ui/sign-up-page`, `ci/add-workflow-and-audit-fixes`, `deployment/proxy`

---

## 3. File Organization Patterns

### Backend (`backend/src/`)

```
api/routes/          # One file per resource: auth.ts, patients.ts, encounters.ts, etc.
api/routes/dev/      # Dev-only routes (ai.ts, db.ts) — disabled in production
config/              # AWS, DB, app configuration (appConfig.ts, db.ts, awsS3.ts)
middleware/          # auth.ts, audit.ts, context.ts, error.ts, securityMonitor.ts
services/            # Business logic: patientService.ts, encounterService.ts, claimService.ts
services/ai/         # AI pipeline: speechToSoap.ts, soapToCodes.ts
services/ai/providers/ # Provider adapters: soapGenerator.ts, codeMatcher.ts
utils/               # crypto.ts, logger.ts
db/                  # queries.ts (raw SQL via pg)
types/               # zod.ts (Zod schemas for route validation)
data/ai/             # Static datasets (cpt_curated.json, cptDataLoader.ts)
```

**Key rule:** One route file per API resource. Route files wire HTTP verbs to service methods; business logic lives in `services/`, SQL in `db/queries.ts`.

### Frontend (`frontend/app/`)

```
(pages)/             # Auth/public pages: login, signup, landing
dashboard/           # Authenticated app views (encounters, patients, claims, organization)
components/          # Shared UI components
components/ui/       # Low-level UI primitives (Sidebar, WizardContainer, PasswordStrengthBlock)
components/wizard/   # Multi-step encounter wizard steps
context/             # AuthContext.tsx — JWT state and useAuthorization() hook
lib/api/             # One file per backend resource matching route names exactly
lib/types/           # index.ts — TypeScript types
lib/validation/      # schemas.ts — Zod response validation schemas
```

**Key rule:** `lib/api/` module names mirror backend route names 1:1 (patients.ts, encounters.ts, soap.ts, etc.).

### Handoffs (`handoffs/`)

Per-issue handoff folders following the pattern `handoffs/GH-<issue-number>/`:
```
handoffs/GH-116/
  handoff.md        # Intake: problem statement, scope, do-not-touch zones
  analysis.md       # Technical analysis of affected code
  implementation.md # Step-by-step what was built, files changed, verification commands
  ship-report.md    # Post-ship summary
  STATUS.md         # Single word: SHIPPED or IN_PROGRESS
```

This pattern is used for all security-sensitive or multi-file changes.

---

## 4. Recurring File Change Clusters

Files that change together (co-change patterns from git history):

### Auth changes
`backend/src/api/routes/auth.ts` + `backend/src/middleware/auth.ts` + `frontend/app/context/AuthContext.tsx` + `frontend/app/(pages)/login/page.tsx` or `signup/page.tsx`

### AI pipeline changes
`backend/src/api/routes/soap.ts` + `backend/src/api/routes/codes.ts` + `backend/src/api/routes/transcribe.ts` + `backend/src/services/ai/providers/soapGenerator.ts` + `backend/src/services/ai/providers/codeMatcher.ts`

### PHI encryption changes
`backend/src/utils/crypto.ts` + `backend/src/db/queries.ts` + `backend/src/services/patientService.ts` + `backend/src/services/encounterService.ts` + `backend/src/services/claimService.ts` + corresponding test under `backend/tests/security/`

### Frontend API layer changes
`frontend/app/lib/api/axios.ts` + all other `frontend/app/lib/api/*.ts` files (they are updated together when axios config, auth headers, or base URL changes)

### Encounter wizard changes
`frontend/app/dashboard/encounters/create/page.tsx` + `frontend/app/components/wizard/TranscriptionStep.tsx` + `frontend/app/components/ui/WizardContainer.tsx`

### Deployment changes
`docker-compose.prod.yml` + `deploy/nginx/revclear.conf` + `frontend/proxy.ts` + `backend/src/config/appConfig.ts`

---

## 5. Testing Patterns

### Location
`backend/tests/` — Jest with ts-jest. No frontend unit tests observed in history.

### Test file naming
- Security tests: `backend/tests/security/<feature-name>.test.ts`
  - Examples: `phi-mixed-mode-helpers.test.ts`, `ai-results-encryption.test.ts`, `claim-snapshot-encryption.test.ts`
- Auth/rate-limit scripts: `backend/tests/security/*.sh` (bash scripts for API-level verification)
- API penetration test artifacts: `backend/tests/api-testing/burp-suite-*.md`

### Test structure (Jest)
- `beforeEach`: reset modules and set required env vars (especially `PHI_ENCRYPTION_KEY`)
- `afterAll`: restore original env var values
- Use `jest.resetModules()` + `require()` inside tests when module-level initialization depends on env vars
- Tests use `encryptPHI*` helpers directly to create realistic fixtures — no manual base64 strings

### What is tested
- PHI encryption/decryption round-trips
- Mixed-mode reads (encrypted rows + legacy plaintext rows must both work)
- Null-safety of optional row fields
- Auth token validity and cookie behavior (referenced in commit messages, with corresponding test files)

### Verification pattern in handoffs
Each implementation step lists its exact verification command:
```bash
cd backend && npx jest --config jest.config.ts --runInBand tests/security/<file>.test.ts --verbose
cd backend && npm test -- --runInBand
```

---

## 6. Architecture Conventions

### API Response Envelope
All routes return a consistent JSON envelope:
```typescript
{ success: true, data: <payload> }
{ success: true, data: <items>, pagination: { limit, offset, total, hasMore } }
{ success: false, errors: <zod errors> }
{ error: "<user-safe message>" }   // used for auth errors
```
Never return raw arrays. Never include internal IDs or server-side fields in responses.

### Input Validation (backend)
- All route bodies and URL params validated with Zod before touching business logic
- Pattern: `Schema.safeParse(req.body)` → check `.success` → return 400 with `.error.errors` on failure → pass `.data` to service
- Zod schemas in `backend/src/types/zod.ts`
- UUIDs always validated: `IdParamSchema.safeParse(req.params)`

### Input Validation (frontend)
- Frontend API modules (e.g. `patientsApi`) run `Schema.parse(data)` on outbound payloads before `axios.post/put`
- Response validation schemas in `frontend/app/lib/validation/schemas.ts` use `.strip()` to drop unknown fields
- `z.never()` guards on sensitive fields (e.g. `edi_sftp_password`) cause parse to throw if the backend accidentally leaks credentials

### Middleware chain
Every authenticated route uses this exact middleware stack:
```typescript
router.get("/", authMiddleware, requireOrganization, async (req, res, next) => { ... })
```
Admin-only routes add `requireRole(['admin'])` between `authMiddleware` and `requireOrganization`.

### Organization scoping
All data queries are scoped by both `organization_id` AND `clinician_id` — never one without the other. These come from `req.organization!.id` and `req.user!.id` set by middleware.

### Logging
- Structured logging via `pino` (`backend/src/utils/logger.ts`)
- Log calls use object form: `logger.info({ attempt, err: err?.message }, "Auth: JWKS fetched")`
- No PHI in log messages — patient data, SOAP notes, diagnoses are never logged
- Audit events are logged via the `audit` middleware, not inline in routes

### Error handling
- Routes pass errors to `next(error)` — never `res.status(500).json(err.message)` directly
- Error messages sent to clients are generic (no stack traces, no internal field names)
- Error type-narrowing: `error instanceof Error ? error.message : "Unknown error"`

---

## 7. Security Patterns

### JWT / Cookie storage
- Access tokens stored in `httpOnly` cookies only — never in `localStorage` or response body
- Refresh tokens also in `httpOnly` cookies with 7-day expiry
- Cookie config varies by environment: `secure: true` and `sameSite: 'strict'` in production; `sameSite: 'lax'` in development (different ports)
- Backend reads token from cookie first, falls back to `Authorization: Bearer` header
- On logout: `res.clearCookie()` with the same path/secure/sameSite options used on set

### PHI Encryption
- Algorithm: AES-256-GCM via Node `crypto` module
- Key: 32-byte hex from `PHI_ENCRYPTION_KEY` env var; module refuses to start if key is invalid
- Text field format: `revclear:phi:v1:<iv>:<tag>:<ciphertext>`
- JSON field format: `{ "__revclear_encrypted": true, "ciphertext": "<iv>:<tag>:<ciphertext>" }`
- Mixed-mode reads: always check marker before decrypting so legacy plaintext rows still work
- Helpers: `encryptPHIText`, `decryptPHIText`, `encryptPHIJson`, `decryptPHIJson`, `decryptPHITextFields`, `decryptPHIJsonFields` — all in `backend/src/utils/crypto.ts`
- Transform helper `transformPHIFields` is null-safe and creates a new object (never mutates)

### SQL safety
- Raw `pg` with parameterized queries only — no string interpolation, no ORMs
- Explicit column lists in all SELECT and RETURNING clauses — no `SELECT *`, no `RETURNING *`
- All queries in `backend/src/db/queries.ts`

### Cognito RBAC
- Groups from `cognito:groups` JWT claim map to application roles: `Admin` → `admin`, `Users` / (none) → `clinician`
- `requireRole(['admin'])` middleware for admin-only routes
- Frontend `useAuthorization()` hook for UI-only role visibility (defense-in-depth, not enforcement)

### Content Security Policy
- CSP configured in `frontend/next.config.ts`
- Nonce generation for inline scripts via `frontend/proxy.ts`
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

### Data minimization
- `stripSensitiveOrgFields()` strips `edi_sftp_password` and `edi_sftp_private_key` from organization responses
- SFTP credentials managed server-side only; never sent to or rendered by frontend
- Dev routes (`/api/dev/*`) disabled unless `NODE_ENV !== 'production'`

### Rate limiting & monitoring
- IP-based rate limiting on all API routes via `express-rate-limit` (configured in `server.ts`)
- `securityMonitor.ts` middleware detects SQL injection patterns, XSS, and brute-force attempts

---

## 8. Key Files Quick Reference

| File | Role |
|---|---|
| `backend/src/server.ts` | Express app setup, middleware registration, rate limiting |
| `backend/src/middleware/auth.ts` | Cognito JWT verification with JWKS retry logic |
| `backend/src/middleware/audit.ts` | HIPAA audit logging, PHI masking |
| `backend/src/middleware/context.ts` | `requireOrganization` middleware |
| `backend/src/utils/crypto.ts` | All PHI encrypt/decrypt helpers |
| `backend/src/utils/logger.ts` | Pino structured logger |
| `backend/src/db/queries.ts` | All raw SQL queries |
| `backend/src/config/appConfig.ts` | Environment-aware config object |
| `frontend/app/context/AuthContext.tsx` | JWT state, `useAuthorization()` hook |
| `frontend/app/lib/api/axios.ts` | Axios instance with `withCredentials: true` |
| `frontend/app/lib/validation/schemas.ts` | Zod response validation with `z.never()` credential guards |
| `frontend/proxy.ts` | Next.js middleware proxy with CSP nonce generation |
