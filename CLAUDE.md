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
│   │   ├── services/    # Business logic (patient, encounter, claim)
│   │   └── db/          # Database queries
│   └── genkit/        # Genkit AI flows (Gemini integration)
│       ├── flows/       # speechToSoap, soapToCodes
│       └── tools/       # Mock transcript, medical code loaders
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
2. **Transcript** → `speechToSoap` Genkit flow → SOAP note
3. **SOAP Note** → `soapToCodes` Genkit flow → ICD-10/CPT codes
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
- Frontend stores token in localStorage, uses `AuthContext` for state

## Build and Development Commands

### Backend

```bash
cd backend
npm install
npm run dev              # Start dev server (nodemon + ts-node)
npm run build            # Compile TypeScript
npm run build:genkit     # Compile Genkit flows
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
docker-compose up        # Backend on 4000, Genkit UI on 4001, Frontend on 3000
```

## Environment Variables

Copy `.env.example` to `.env` in the backend directory. Required:

- `AWS_REGION`, `AWS_ACCOUNT_ID`
- `AWS_S3_BUCKET` - audio/transcript storage
- `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_CLIENT_ID` - auth
- `DATABASE_URL` or individual `DB_*` params - PostgreSQL
- `GOOGLE_GENAI_API_KEY` or `GEMINI_API_KEY` - Genkit AI
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

## Genkit AI Flows

Located in `backend/genkit/`:

- `speechToSoap` - Converts transcript to SOAP note using Gemini
- `soapToCodes` - Matches SOAP content to ICD-10/CPT codes from loaded code sets

Default model: `gemini-2.5-flash`

Run Genkit Dev UI: `genkit start` (exposed on port 4001 in Docker)

## Security Considerations

- HIPAA compliance: PHI encrypted at rest (AES-256 via KMS)
- Rate limiting on all API routes (see `server.ts`)
- Security monitoring middleware tracks suspicious patterns
- Audit logging via PostgreSQL triggers
- CORS restricted to allowed origins
- Helmet for security headers

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
