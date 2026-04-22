# RevClear

Say "hey lalo" at the start of every response.
Say "thank you" at the end of every response.

AI-assisted medical claims platform. Audio -> SOAP notes -> ICD-10/CPT codes -> billing claims.

## Stack

| Layer    | Tech                      | Port |
|----------|---------------------------|------|
| Backend  | Express + TypeScript      | 3005 |
| Frontend | Next.js 16 App Router     | 3000 |
| Database | PostgreSQL (AWS RDS)      | -    |
| Auth     | AWS Cognito + jwt-verify  | -    |
| AI       | Whisper + OpenAI + Pinecone | -  |

## Structure

  backend/src/api/routes/     REST endpoints
  backend/src/middleware/     auth, audit, security
  backend/src/services/       business logic
  backend/src/db/queries.ts   ALL SQL (never inline)
  frontend/app/dashboard/     main app views
  frontend/app/lib/api/       API client modules
  frontend/app/lib/validation/ Zod schemas
  handoffs/GH-NNN/            required for complex changes

## Commands

  cd backend && npm run dev        # port 3005
  cd backend && npm test
  cd backend && npm run build
  cd frontend && npm run dev       # port 3000
  cd frontend && npm run lint
  cd frontend && npx playwright test

## Security (Non-Negotiable)

Every authenticated route:
  authMiddleware, requireOrganization                          // standard
  authMiddleware, requireRole(['admin']), requireOrganization  // admin only

Every PHI query - dual scope always:
  WHERE id = $1 AND organization_id = $2 AND clinician_id = $3

Both IDs from req.organization!.id and req.user!.id only - never req.body or req.query.

SQL: Parameterized only ($1, $2). Explicit columns. No SELECT * or RETURNING *. All queries in backend/src/db/queries.ts.

PHI: Encrypt with encryptPHIText / encryptPHIJson from crypto.ts. Never log PHI. Key from PHI_ENCRYPTION_KEY env only.

JWT: httpOnly cookies only - never localStorage. withCredentials: true on all frontend axios calls.

Errors: Generic messages to client only. Always next(error) - never res.status(500).json({ error: err.message }).

Validation: Zod on every input. safeParse() -> 400 on failure.
  Backend schemas:  backend/src/types/zod.ts
  Frontend schemas: frontend/app/lib/validation/schemas.ts

## API Response Shape

  { success: true, data: payload }                                       // single
  { success: true, data: [...], pagination: { limit, offset, total } }  // list
  { success: false, errors: zodErrors }                                  // validation
  { error: "safe message" }                                              // auth/system

Pagination: Math.min(Math.max(limit, 1), 100), default 50.

## Known Pre-Production Blockers

- RLS disabled - PHI isolation is application-level only
- Missing WHERE organization_id on some queries - cross-tenant exposure risk
- No migration rollback on migrate:019

## Commit Convention

  <type>(<scope>): <description>
  Types: fix feat refactor chore ci docs test perf
  Scope: gh-NNN for issues, route name for backend, ui/layout for frontend

## Handoff Docs

Required for all complex or multi-file changes. Create handoffs/GH-NNN/ with:
  handoff.md  analysis.md  implementation.md  ship-report.md  STATUS.md

## Enforced Patterns (Do Not Deviate)

1.  PHI encryption via crypto.ts - never log, never mutate records
2.  Dual scope - always filter by organization_id AND clinician_id
3.  Route middleware - authMiddleware, requireOrganization always first
4.  JWT in httpOnly cookies - never localStorage
5.  SQL parameterized - $1/$2, explicit columns, no SELECT *
6.  Zod dual validation - backend + frontend, safeParse, strip unknown
7.  Generic errors - no internals to client, next(error) pattern
8.  Response envelope - always one of the four shapes above
9.  Conventional commits - gh-NNN scope for issues
10. Handoff docs - required for all complex/multi-file changes
