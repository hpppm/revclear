# CLAUDE.md - AI Assistant Configuration for RevClear

## ⚠️ MANDATORY RULES - READ FIRST ⚠️

**YOU MUST follow these rules for EVERY response in this project:**

### Response Format (NON-NEGOTIABLE)
1. ✅ **START** every response with: `I got you`
2. ✅ **END** every response with: `my bro`
3. ✅ **CHECK** this file BEFORE responding to ANY task
4. ✅ **APPLY** relevant agents, skills, and prompts defined below

**NO EXCEPTIONS.** These are project-specific conventions that override default behavior.

### Before Any Task
1. Read relevant sections of this file
2. Check for applicable agents in `.claude/agents/`
3. Check for applicable skills in `.claude/skills/`
4. Apply security and coding standards from `.claude/rules/`
5. Use slash commands when appropriate

### Context Awareness
- This is a **HIPAA-regulated healthcare application**
- All code touches **PHI/PII** - security is paramount
- Multi-tenant architecture - always scope by `organization_id`
- Review `backend/docs/DATA_SECURITY.md` before touching encryption
- Review `DASH_WORKFLOW.md` before modifying testing-dashboard

### Self-Check Before Every Response
- [ ] Started with "I got you"
- [ ] Checked `@claude.md` for task-specific guidelines
- [ ] Applied appropriate agents/skills
- [ ] Referenced project context (HIPAA, security, architecture)
- [ ] Ending with "my bro"

---

## Project Overview

**RevClear** is an AI-assisted medical claims and speech transcription platform for healthcare billing workflows. It handles PHI/PII and must comply with HIPAA, NIST CSF, and OWASP API security requirements.

### Key Capabilities
- Audio transcription (Whisper) → SOAP note generation (Gemini AI)
- Medical code matching (ICD-10/CPT) from clinical documentation
- Claims management with payer validation
- Multi-tenant organization support with RBAC

---

## Project Structure

```
revclear/
├── backend/                    # Express + TypeScript API (port 3005)
│   ├── src/                   # Main application source
│   │   ├── api/routes/        # REST endpoints
│   │   ├── services/          # Business logic layer
│   │   ├── middleware/        # Auth, audit, security
│   │   ├── config/            # AWS clients, DB config
│   │   └── utils/             # Helpers & utilities
│   ├── genkit/                # AI flows (Gemini)
│   │   └── flows/             # speechToSoap, soapToCodes
│   ├── docs/                  # Backend documentation
│   │   ├── db/                # SQL migrations & schema
│   │   └── DATA_SECURITY.md   # PHI encryption specs
│   └── tests/                 # Jest test suites
│
├── frontend/                   # Next.js App Router (port 3000)
│   ├── app/                   # Pages & components
│   │   ├── (pages)/           # Route groups
│   │   ├── components/        # Reusable UI
│   │   ├── dashboard/         # Main app dashboard
│   │   └── context/           # React contexts
│   └── documentation/         # Frontend API docs
│
├── testing-dashboard/          # Reference implementation for AWS helpers
│   └── DASH_WORKFLOW.md       # ⚠️ READ FIRST - do-not-modify rules
│
├── terraform/                  # AWS Infrastructure as Code
├── Demo/                       # Interactive workflow demo (static HTML)
│
├── docs/                       # Project documentation hub
│   ├── workflow/              # Development process docs
│   └── architecture/          # System design docs
│
├── .github/
│   ├── agents/                # AI agent skills & prompts
│   │   ├── prompts/           # Reusable prompt templates
│   │   └── skills/            # Copilot agent skills
│   ├── codeql/                # Security scanning queries
│   └── workflows/             # GitHub Actions
│
└── [Root Files]
    ├── CLAUDE.md              # This file - AI guidance
    ├── README.md              # Project overview
    ├── CONTRIBUTING.md        # Contribution guidelines
    ├── CHANGELOG.md           # Version history
    ├── docker-compose.yml     # Full stack containers
    └── LICENSE                # MIT License
```

---

## Development Commands

### Backend (Express + TypeScript, port 3005)
```bash
cd backend
npm install
npm run dev                 # Development server with hot reload
npm run build               # Compile TypeScript
npm test                    # Run Jest tests
npm run depcheck            # Check for unused dependencies
```

### Frontend (Next.js, port 3000)
```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

### Testing Dashboard (Next.js, port 3000)
```bash
cd testing-dashboard
npm install
npm run dev
```

### Docker (Full Stack)
```bash
docker-compose up           # Backend on 4000, Genkit on 4001, Frontend on 3000
```

### Genkit AI Flows
```bash
cd backend
npm run build:genkit        # Compile Genkit flows
# Genkit dev UI launches automatically with docker-compose
```

---

## Architecture

### Multi-Tenant Healthcare Platform
- **Authentication**: AWS Cognito with JWT verification via `authMiddleware`
- **Multi-tenancy**: All PHI queries scoped by `organization_id`. Users belong to exactly one organization.
- **Database**: PostgreSQL (RDS) with schema migrations in `backend/docs/db/`

### Backend Structure (`backend/src/`)
- `server.ts` - Express app with middleware ordering (CORS → security → rate limiting → routes → error handler)
- `api/routes/` - REST endpoints: auth, patients, encounters, claims, transcribe, soap, organizations, me, health
- `services/` - Business logic layer: authService, patientService, encounterService, claimService
- `middleware/` - auth.ts (JWT verification), audit.ts, securityMonitor.ts, error.ts
- `config/` - appConfig (Zod-validated env), AWS clients (Cognito, S3, RDS)

### AI Processing (`backend/genkit/`)
- `flows/speechToSoap.ts` - Converts Whisper transcripts to SOAP notes via Gemini
- `flows/soapToCodes.ts` - Matches SOAP notes to ICD-10/CPT codes
- Uses Google Genkit with `gemini-2.5-flash` model
- Results stored in `ai_results` table with `flow_name` identifier

### Frontend Structure (`frontend/app/`)
- Next.js App Router with `(pages)/` route groups (landing, login, signup)
- `components/` - AudioRecorder, AudioUploader, SoapNoteViewer, MedicalCodesViewer
- `dashboard/` - Main application dashboard

### Testing Dashboard (`testing-dashboard/`)
- Reference implementation for `/api/dashboard/*` helpers
- **Read this first**: `DASH_WORKFLOW.md` - Documents do-not-modify expectations
- Proxies API calls to backend via Next.js rewrites

---

## Critical Patterns

### Route Ordering
`/api/transcribe` must be registered BEFORE `express.json()` middleware to allow multipart/form-data parsing.

### Rate Limiting
Different limits per endpoint: auth (10/min), transcribe (5/min), patients/encounters/claims (60/min), organizations/me/users (30/min).

### Data Flow
1. Audio uploaded via `/api/transcribe` → S3 storage + `audio_records` table
2. Whisper transcription → `ai_results` (flow_name='whisper_transcript')
3. SOAP generation via Genkit → `ai_results` (flow_name='soap_gemini')
4. Claims created from SOAP → `claims` table with status workflow

### Environment Variables
Required in `backend/.env`:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_USER_POOL_ID`, `AWS_CLIENT_ID`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (for Genkit)

Test email domains must end with `@localhost.dev` (override via `TEST_EMAIL_DOMAIN`).

---

## Security Constraints

⚠️ **This is a HIPAA-regulated healthcare application**

### PHI/PII Handling
- **Never log**: Patient names, SSN, transcripts, SOAP notes, medical codes
- **Always use**: Parameterized SQL statements (no string interpolation)
- **Encryption**: AES-256-GCM for sensitive columns (see `backend/docs/DATA_SECURITY.md`)
- **Encryption must fail loudly**: PHI encryption/decryption throws errors if key is missing (never returns plaintext)
- **Mask PII in logs**: Email addresses must be masked (e.g., `us***@example.com`)

### API Security
- Auth failures: 401 (missing/invalid token), 403 (wrong organization)
- No stack traces or internal details in API responses
- All endpoints rate-limited appropriately
- AI endpoints (SOAP/codes) have stricter rate limits (10/min)
- CORS configured with explicit origin whitelist (set `ALLOWED_ORIGINS` env var)
- Security headers: `Cache-Control: no-store` on all API responses

### Dev Routes Security
- All dev routes (`/api/dev/*`) require **admin role** in addition to authentication
- Dev routes are only available in development environment
- S3 and Cognito dev routes log unauthorized access attempts

### Input Validation
- All user inputs validated with Zod schemas
- File uploads limited: 50MB max, audio/* MIME types only
- SQL field names whitelisted to prevent injection via dynamic queries

### Compliance References
- HIPAA Security Rule (45 CFR Part 160, 162, 164)
- NIST Cybersecurity Framework (CSF)
- OWASP API Security Top 10

### Security Review Process
Before committing code that touches auth, PHI, or user input:
1. Run the security-reviewer agent: `@.claude/agents/security-reviewer.md`
2. Check for hardcoded secrets with `grep -r "api[_-]?key\|password\|secret" --include="*.ts"`
3. Verify all inputs are validated with Zod
4. Ensure no PHI is logged
5. Run `npm audit` to check dependencies

---

## AI Agent Skills

The project includes Copilot agent skills in `.github/agents/skills/`:

| Skill | Purpose |
|-------|---------|
| `security-audit.md` | Scan for vulnerabilities before release |
| `api-inventory.md` | Catalog all API endpoints with auth status |
| `dead-code-finder.md` | Find orphaned files and unused exports |
| `dependency-analyzer.md` | Check for unused/misplaced npm packages |
| `tech-stack-scanner.md` | Generate technology overview |
| `public-release-checklist.md` | Pre-release verification checklist |

Use these skills when:
- Preparing for a release
- Auditing security posture
- Cleaning up technical debt
- Onboarding new team members

---

## Branch & Commit Conventions

### Branch Naming
Format: `[type]/description`
- `feature/` - New features
- `bug/` - Bug fixes
- `ui/` - UI/UX changes
- `chore/` - Maintenance
- `documentation/` - Docs updates
- `devops/` - CI/CD, infrastructure

### Commit Format
```
[type]: short description

feat:     New feature
fix:      Bug fix
docs:     Documentation
refactor: Code refactoring
chore:    Maintenance
test:     Adding tests
style:    Formatting only
```

---

## Testing Dashboard Rules

The `testing-dashboard/` app is the canonical reference for AWS helper flows. Per `DASH_WORKFLOW.md`:

- ⚠️ Treat as **read-only** except for explicitly requested features
- Do not rename IDs, change DOM structure, or alter request semantics
- Changes must be documented in DASH_WORKFLOW.md and coordinated with frontend team

---

## Quick Reference

### Important Files to Read First
1. `backend/docs/BACKEND_REVCLEAR_v1.1.0.md` - Full backend API documentation
2. `backend/docs/DATA_SECURITY.md` - PHI encryption and security
3. `testing-dashboard/DASH_WORKFLOW.md` - Dashboard modification rules
4. `docs/workflow/TICKET_STRUCTURE.md` - How to create tickets

### Database
- Schema: `backend/docs/db/revclear_schema_current.sql`
- Migrations: `backend/docs/db/0*.sql` files

### API Routes
All routes in `backend/src/api/routes/`:
- `auth.ts` - Login, signup, token refresh
- `patients.ts` - Patient CRUD
- `encounters.ts` - Encounter management
- `claims.ts` - Claims lifecycle
- `transcribe.ts` - Audio upload & processing
- `soap.ts` - SOAP note generation
- `organizations.ts` - Multi-tenant management
- `me.ts` - Current user profile
- `health.ts` - Health checks


## Global Claude Rules (revclear)

Always apply the following rules unless explicitly overridden:

| Rule | Purpose |
|------|---------|
| @.claude/rules/coding-style.md | Immutability, file organization, error handling |
| @.claude/rules/security.md | Security checks, secret management, response protocol |
| @.claude/rules/git-workflow.md | Commit format, PR workflow, feature implementation |
| @.claude/rules/testing.md | 80% coverage requirement, TDD workflow |
| @.claude/rules/agents.md | Agent orchestration and parallel execution |
| @.claude/rules/hooks.md | Pre/Post tool hooks and auto-accept permissions |
| @.claude/rules/patterns.md | API response format, custom hooks, repository pattern |
| @.claude/rules/performance.md | Model selection, context management, ultrathink |

---

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| @.claude/agents/planner.md | Implementation planning | Complex features, refactoring |
| @.claude/agents/architect.md | System design & scalability | Architectural decisions |
| @.claude/agents/tdd-guide.md | Test-driven development | New features, bug fixes (80%+ coverage) |
| @.claude/agents/code-reviewer.md | Code quality review | After writing code |
| @.claude/agents/security-reviewer.md | Security vulnerability detection | Before commits, auth/API changes |
| @.claude/agents/build-error-resolver.md | Fix build/TypeScript errors | When build fails |
| @.claude/agents/e2e-runner.md | Playwright E2E testing | Critical user flows |
| @.claude/agents/refactor-cleaner.md | Dead code cleanup | Code maintenance, unused exports |
| @.claude/agents/doc-updater.md | Documentation & codemaps | Updating docs/CODEMAPS |

---

## Available Skills

| Skill | Purpose |
|-------|---------|
| @.claude/skills/backend-patterns.md | Backend architecture patterns (API, repository, caching) |
| @.claude/skills/frontend-patterns.md | React/Next.js patterns (hooks, state, performance) |
| @.claude/skills/tdd-workflow/SKILL.md | TDD Red-Green-Refactor workflow |
| @.claude/skills/security-review/SKILL.md | Security vulnerability checklist |
| @.claude/skills/coding-standards.md | Code quality standards |
| @.claude/skills/clickhouse-io.md | ClickHouse database patterns |

---

## Available Commands (Slash Commands)

| Command | Purpose |
|---------|---------|
| /plan | Create implementation plan, wait for user confirm |
| /tdd | Enforce test-driven development workflow |
| /code-review | Run code review on recent changes |
| /build-fix | Fix build and TypeScript errors |
| /e2e | Generate and run E2E tests with Playwright |
| /refactor-clean | Find and remove dead code |
| /test-coverage | Check and improve test coverage |
| /update-docs | Update documentation |
| /update-codemaps | Regenerate codemaps from code

## finish your answer with (my bro)