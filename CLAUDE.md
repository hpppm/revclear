# RevClear — Claude Rules

say hey lalo at the start of every response
say thank you at the end of every response

## Project

AI-assisted medical claims and speech transcription platform. Processes clinical audio → SOAP notes → ICD-10/CPT codes → billing claims.

**Stack:** Express + TypeScript (port 3005) | Next.js 16 App Router (port 3000) | PostgreSQL (AWS RDS) | AWS Cognito

**Structure:**
- `backend/src/api/routes/` — REST endpoints
- `backend/src/middleware/` — auth, audit, security
- `backend/src/services/` — business logic
- `backend/src/db/` — all SQL queries
- `frontend/app/dashboard/` — main app views
- `frontend/app/lib/api/` — API client modules

**Data flow:** Audio → S3 → Whisper → `speechToSoap` → `soapToCodes` → claim → EDI

## Commands
```bash
cd backend && npm run dev       # port 3005
cd backend && npm test
cd backend && npm run build
cd frontend && npm run dev      # port 3000
cd frontend && npm run lint
```

## Security Rules (Non-Negotiable)

**Every authenticated route:**
```typescript
authMiddleware, requireOrganization                            // standard
authMiddleware, requireRole(['admin']), requireOrganization    // admin only
```

**Every PHI query:**
```sql
WHERE id = $1 AND organization_id = $2 AND clinician_id = $3
```
Both IDs from `req.organization!.id` and `req.user!.id` only — never req.body/query.

**SQL:** Parameterized only (`$1`, `$2`). Explicit column lists. No `SELECT *` or `RETURNING *`. All queries in `backend/src/db/queries.ts`.

**PHI encryption:** `encryptPHIText` / `encryptPHIJson` from `backend/src/utils/crypto.ts`. Never log PHI. Key from `PHI_ENCRYPTION_KEY` env var only.

**JWT:** httpOnly cookies only — never localStorage. `withCredentials: true` on frontend axios globally.

**Errors to client:** Generic only. Call `next(error)` — never `res.status(500).json({ error: err.message })`.

**Validation:** Zod on every input, backend and frontend. `Schema.safeParse()` → 400 on failure.
- Backend schemas: `backend/src/types/zod.ts`
- Frontend schemas: `frontend/app/lib/validation/schemas.ts`

## API Response Shape
```typescript
{ success: true, data: payload }                                        // single
{ success: true, data: [...], pagination: { limit, offset, total } }   // list
{ success: false, errors: zodErrors }                                   // validation
{ error: "safe message" }                                               // auth/system
```
Pagination: `Math.min(Math.max(limit, 1), 100)`, default 50.

## Authentication

Cognito JWT → `aws-jwt-verify` in `middleware/auth.ts`. Token read from `req.cookies.accessToken` first. Cookie: `httpOnly`, `secure` (prod), `sameSite: strict` (prod) / `lax` (dev).

| Cognito Group | Role |
|---|---|
| Admin | admin |
| Users / none | clinician |

## Known Security Gaps (Pre-Production Blockers)

- RLS disabled (`SET row_security = off`) — PHI isolation is application-level only
- Missing `WHERE organization_id` = cross-tenant PHI exposure
- No migration framework — `migrate:019` has no rollback

## Context7 (Mandatory)

Before writing code using any external library:
1. Call `mcp__plugin_context7_context7__resolve-library-id`
2. Call `mcp__plugin_context7_context7__query-docs`
Never rely on training data for library APIs.

## Commit Convention

`<type>(<scope>): <description>`

Types: `fix`, `feat`, `refactor`, `chore`, `ci`, `docs`, `test`, `perf`
Scopes: `gh-NNN` for issues, route name for backend, `ui`/`layout` for frontend

## Handoff Documents

For any complex multi-file change or GitHub-issue feature, create `handoffs/GH-<NNN>/` with:
`handoff.md`, `analysis.md`, `implementation.md`, `ship-report.md`, `STATUS.md`

## Learned Patterns

Source: `revclear/.claude/instincts/` — 200 commits of enforced patterns.
Do not deviate without explicit instruction.

1. **PHI encryption** — use crypto.ts helpers, never log PHI, never mutate records
2. **Dual scoping** — always filter by both `organization_id` AND `clinician_id`
3. **Route middleware chain** — `authMiddleware, requireOrganization` always first
4. **JWT cookies** — httpOnly only, never localStorage
5. **SQL parameterization** — `$1`/`$2` only, explicit columns, no SELECT *
6. **Zod dual validation** — backend + frontend, safeParse, strip unknown fields
7. **Generic errors** — no internal details to client, next(error) pattern
8. **Response envelope** — always one of the four shapes above
9. **Commit convention** — conventional commits, gh-NNN scope for issues
10. **Handoff docs** — required for all complex/multi-file changes
