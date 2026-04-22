# RevClear

Say "hey lalo" at the start of every response.
Say "thank you" at the end of every response.

AI-assisted medical claims platform. Audio -> SOAP notes -> ICD-10/CPT codes -> billing claims.

## Stack

| Layer    | Tech                                      | Port |
|----------|-------------------------------------------|------|
| Backend  | Express + TypeScript                      | 3005 |
| Frontend | Next.js 16 App Router                     | 3000 |
| Database | PostgreSQL (AWS RDS)                      | -    |
| Auth     | AWS Cognito + jwt-verify + Resend (email) | -    |
| AI       | Whisper + Groq + Gemini + Pinecone        | -    |

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

Admin-only endpoints: GET /api/users, GET /api/users/:id, GET /api/health/ai, GET /api/security/stats

Every PHI query - dual scope always:
  WHERE id = $1 AND organization_id = $2 AND clinician_id = $3

Both IDs from req.organization!.id and req.user!.id only - never req.body or req.query.

SQL: Parameterized only ($1, $2). Explicit columns. No SELECT * or RETURNING *. All queries in backend/src/db/queries.ts.

PHI: Encrypt with encryptPHIText / encryptPHIJson from crypto.ts. Never log PHI. Key from PHI_ENCRYPTION_KEY env only.

JWT: httpOnly cookies only - never localStorage. withCredentials: true on all frontend axios calls.
  Cookies: accessToken (1h), refreshToken (7d), mfaVerified (1h), sessionStart (signed HMAC, 7d)
  Token rotation: GetTokensFromRefreshTokenCommand — all 3 cookies rotated on every refresh.
  Session limits: 8h absolute timeout, 30min idle timeout, one concurrent session per user (active_sessions table).

Auth flow:
  Signup:  email → OTP verify (otp_codes table, Resend) → TOTP setup → dashboard
  Signin:  email + password → email_verified check → TOTP challenge → dashboard

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

- RLS disabled — PHI isolation is application-level only
- No migration rollback scripts (migrations 019+)

## Required Env Vars (Production)

  PHI_ENCRYPTION_KEY   64-char hex — encrypts all PHI at rest
  SESSION_SECRET       32+ char random string — signs sessionStart cookie
  RESEND_API_KEY       Resend API key — sends OTP emails
  AWS_USER_POOL_ID     Cognito user pool
  AWS_CLIENT_ID        Cognito app client
  AWS_REGION           us-east-1
  DB_HOST / DB_USERNAME / DB_PASSWORD / DB_DATABASE
  GROQ_API_KEY         Groq LLM fallback
  GEMINI_API_KEY       Gemini primary AI
  PINECONE_API_KEY / PINECONE_INDEX_HOST

## Commit Convention

  <type>(<scope>): <description>
  Types: fix feat refactor chore ci docs test perf
  Scope: gh-NNN for issues, route name for backend, ui/layout for frontend

## Handoff Docs

Required for all complex or multi-file changes. Create handoffs/GH-NNN/ with:
  handoff.md  analysis.md  implementation.md  ship-report.md  STATUS.md

## Enforced Patterns (Do Not Deviate)

1.  PHI encryption via crypto.ts — never log, never mutate records
2.  Dual scope — always filter by organization_id AND clinician_id
3.  Route middleware — authMiddleware, requireOrganization always first
4.  JWT in httpOnly cookies — never localStorage
5.  SQL parameterized — $1/$2, explicit columns, no SELECT *
6.  Zod dual validation — backend + frontend, safeParse, strip unknown
7.  Generic errors — no internals to client, next(error) pattern
8.  Response envelope — always one of the four shapes above
9.  Conventional commits — gh-NNN scope for issues
10. Handoff docs — required for all complex/multi-file changes
11. Token rotation — use refreshAuthTokensWithRotation, never refreshAuthTokens in new code
12. Session management — upsertActiveSession on every login, validateActiveSession in authMiddleware
13. email_verified — enforced on signin; users without verified email are blocked at auth layer

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.