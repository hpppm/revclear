# Backend Plan — RevClear v1.1.0

This document captures the planned **production-facing** backend routes, flows, and behaviors for RevClear.  
All `/api/dev/*` and mock-only endpoints are excluded or disabled in production.

**Date:** 2025-11-28  
**Version:** 1.1.0

---

## Scope

- Public API roots (prod):  
  - `/api/auth`  
  - `/api/me`  
  - `/api/health`  
  - `/api/organizations`  
  - `/api/patients`  
  - `/api/encounters`  
  - `/api/claims`  
  - `/api/transcribe`  
  - `/api/soap`

- **DB:** PostgreSQL (RDS), schema frozen as of migration `015_organization_billing_profile.sql`.  
  Core tables used by the API:
  - `organizations`, `organization_members`
  - `users`
  - `patients`
  - `encounters`
  - `audio_records`
  - `ai_results`
  - `claims`
  - `insurance_subscribers`
  - `audit_log`

- **Storage:** S3 for audio/media blobs; DB for structured results (transcripts, SOAP, claims, audit).

- **Validation:** Zod for incoming payloads/params; return structured 4xx on validation issues (no stack traces in responses).

- **Auth:** All routes are protected **except**:
  - `/api/auth/*` (login/register flows)
  - `/api/health` (may be public or auth-gated; see “Open Choices”).

- **Multi-tenancy:** All PHI-accessing queries are scoped by `organization_id`.  
  Users are clinicians who belong to exactly one primary organization (clinic). Patients, encounters, and claims are owned by an organization.

---

## Route Plan

### `/api/auth/*`
Existing Cognito-based auth flows (login, logout, token refresh).  
Backend uses `authMiddleware` to validate JWTs and attach the Cognito `sub` so the internal `users` row can be resolved.

---

### `/api/me`
- **GET**: Returns the current authenticated user from `users`.
  - On first login, if no `users` row exists for the Cognito `sub`, create one.
  - Includes the user’s primary `organization` summary (id, name, role) for the frontend.

---

### `/api/health`
- Lightweight health-check endpoint.
- Checks:
  - DB connectivity (simple `SELECT 1`).
  - Optional: S3 list or head-object on a known key.
- Returns `200` + basic status JSON on success; `5xx` on failure.
- Auth requirement configurable (see “Open Choices”).

---

### `/api/organizations`
Organization (clinic) profile and billing configuration.

- **GET `/api/organizations/current`**
  - Returns the active organization for the current user.
  - Includes:
    - General info (name, phone, address, NPI, tax_id).
    - Billing profile (billing name, billing NPI/EIN, billing address, billing phone, default POS).
    - Optional: high-level stats (patient count, encounter count) for the org hub.

- **PUT `/api/organizations/current`**
  - Updates organization & billing profile fields.
  - AuthZ:
    - Only clinicians marked as org admins (via `organization_members.is_admin`) can edit.
  - Validation:
    - Zod schema enforcing NPI format, EIN format, etc.

- **GET `/api/organizations/current/members`**
  - Returns the clinicians in the organization (for the org hub/team UI).
  - For v1.1.0 this is read-only (no invite flow yet).

*(Any future invite/add-member APIs will be added as new routes; schema remains frozen.)*

---

### `/api/patients`
CRUD operations for patients within the current organization.

- **POST**: Create patient.
  - `organization_id` is taken from the authenticated user’s org (not from the client).
  - Optional `primary_clinician_id` is validated to belong to the same org.
  - Linked `insurance_subscribers` created/updated if provided.

- **GET**: List patients for the current organization.
  - Supports filters: search by name, DOB, insurance ID.
  - Results always scoped by `organization_id`.

- **GET `/:id`**: Fetch single patient by ID.
  - Must belong to the caller’s organization.

- **PUT `/:id`**: Update patient.
  - Scoped to current organization.
  - Zod validation to prevent mass assignment.

- **DELETE `/:id`** (soft delete recommended):
  - Only allowed if feature is enabled; otherwise 405 or not implemented.
  - Audit entry logged for any delete.

---

### `/api/encounters`
Encounters are visits tied to patients and clinicians.

- **POST**: Create new encounter.
  - Required: `patient_id`, encounter metadata.
  - `organization_id` is inferred from the patient (and must match the user’s org).
  - `clinician_id` defaults to the authenticated user.

- **GET**: List encounters by organization and optional filters:
  - `patient_id`, `clinician_id`, date range, status.
  - Always `WHERE organization_id = current_org_id`.

- **GET `/:id`**: Fetch encounter.
  - Valid only if encounter belongs to current org.

- **PUT `/:id`**: Update encounter metadata (not claims).
  - Enforces organization and encounter ownership checks.
  - Used mainly to adjust status, notes, tags.

- **DELETE `/:id`** (optional/rare):
  - Only permitted before claims/clinical documents exist, or disabled for production.
  - Always logs to `audit_log`.

---

### `/api/claims`
Claims represent the billing entity for an encounter.

- **GET**: List claims for current org.
  - Filters: `status`, `payer_id`, date range, clinician.
  - Used for work queues (“draft”, “ready”, “submitted”, etc.).

- **GET `/:id`**: Read a single claim.
  - Ensures claim belongs to current organization.

- **POST** (if enabled in v1.1.0):
  - Creates a claim for a given `encounter_id`.
  - Validation:
    - Encounter must belong to current org.
    - Encounter must not already have an active claim (configurable).
    - Zod schemas validate line items, diagnoses, and status.
  - Sets initial `status = 'draft'`.

- **PUT `/:id`** (optional):
  - Update claim fields/status (e.g., from `draft` → `ready` → `submitted`).
  - Restricted to allowed transitions; enforced via service layer.

- Responses are always `2xx`/`4xx`; no unhandled 5xx leaks.

---

### `/api/transcribe`
Handles audio ingestion and transcription via Whisper.

- Router is mounted **before** `express.json` to allow multipart/form-data parsing.

- **POST `/api/transcribe`**
  - Auth required; user must belong to an org.
  - Accepts:
    - Multipart form with:
      - `audio` (file stream)
      - `encounter_id`
  - Behavior:
    - Store audio file in S3 and create an `audio_records` row (org-scoped).
    - If audio stream present:
      - Stream directly to Whisper (no S3 download).
      - Save transcript text and metadata into `ai_results`:
        - `flow_name = 'whisper_transcript'`
        - `input_json` includes S3 key and encounter ID.
    - If request has no audio (e.g., later re-run):
      - Use stored S3 key from `audio_records` for that encounter.
      - Download from S3 → send to Whisper → update `ai_results`.

- Optional: In a later version, persist transcript JSON copy in S3. For v1.1.0, **DB is source of truth**.

---

### `/api/soap` and `/api/encounters/:id/soap`
AI-generated SOAP notes built on top of transcripts.

- **POST `/api/encounters/:id/soap`**
  - Auth required; encounter must belong to org and clinician.
  - Flow:
    - Fetch transcript for encounter from `ai_results` (`flow_name='whisper_transcript'`).
    - Call configured AI provider (local Ollama or external endpoint) to generate SOAP note.
    - Save SOAP to `ai_results`:
      - `flow_name = 'soap_note'`
      - Either append (versioned) or upsert (see “Open Choices”).
  - Supports “regenerate” by creating a new version.

- **GET `/api/encounters/:id/soap`**
  - Returns the latest SOAP note for an encounter (or a specific version if `?version` is provided).

- **PUT `/api/encounters/:id/soap`**
  - Saves user-edited SOAP text back into `ai_results` as the latest version (with editor + timestamp).
  - Maintains a change history if versioning is enabled.

- Mock-only endpoints (e.g., `/api/encounters/:id/soap/mock`) are **disabled in production** or behind explicit feature flags.

---

## Flows

### 1. Organization & Clinician Setup

1. Clinician signs up / logs in via Cognito.
2. On first login:
   - `users` row is created and linked to Cognito `sub`.
   - If no organization exists, an initial org can be created via the onboarding flow or seeded internally.
3. Organization admin configures:
   - General clinic info.
   - Billing profile (billing name, NPI, EIN, address, phone, default POS).
   - EDI/clearinghouse details (optional, advanced).
4. Clinician profile holds:
   - Personal NPI, license, specialty, preferences.

---

### 2. Encounter Lifecycle (clinical + AI)

1. Clinician selects patient (org-scoped) and **creates encounter** via `/api/encounters`.
2. They record or upload session audio.
3. Frontend POSTs to `/api/transcribe` with `encounter_id` and audio.
4. Backend:
   - Stores audio in S3 and `audio_records`.
   - Runs Whisper and saves transcript in `ai_results`.
5. Clinician triggers SOAP generation via `/api/encounters/:id/soap` POST.
6. SOAP is stored in `ai_results` and shown in the UI.
7. Clinician can regenerate or edit, then save (PUT).

---

### 3. Claim Lifecycle (billing)

1. Once SOAP and coding are ready, frontend requests claim creation via `/api/claims` POST or similar.
2. Backend:
   - Validates encounter ownership and organization.
   - Builds claim entity (diagnosis codes, procedure codes, line items JSON).
   - Sets `status = 'draft'`.
3. Clinician reviews and updates as needed; status moved to:
   - `ready` → `submitted` → `paid` / `rejected`.
4. Integration with a clearinghouse (EDI 837/835) will be added later; v1.1.0 focuses on accurate claim creation and lifecycle tracking.

---

## Data Storage

- **Audio**
  - Stored in S3 using org-scoped keys (e.g., `org_id/encounters/<id>/audio.wav`).
  - Tracked via `audio_records` (encounter_id, s3_key, status, duration).

- **AI Artifacts (transcripts, SOAP)**
  - Stored in `ai_results`:
    - `encounter_id`
    - `flow_name` (`whisper_transcript`, `soap_note`, etc.)
    - `output_json` (contains transcript text or SOAP sections)
    - Optional version metadata.

- **Claims & Clinical Data**
  - Stored in `claims`, `encounters`, `patients`, `insurance_subscribers` as per frozen schema.

- **Audit**
  - Sensitive writes (patient create/update, encounter create/update, claim status changes, AI content creation) are logged to `audit_log`.

---

## Error Handling

- Zod validation failures → `400` with consistent error structure (field, message).
- Auth failures:
  - Missing/invalid token → `401`.
  - Valid token but unauthorized for resource (wrong org) → `403`.
- No stack traces or internal details in responses; errors logged server-side with context.
- All unhandled errors are caught by a global error handler that returns a generic `500`.

---

## Middleware & App Wiring

- Environment loaded via `setupEnv`.
- Middleware order (high level):
  1. `cors`, `helmet` (incl. CSP if used)
  2. `morgan` (or similar logging)
  3. `authMiddleware` for protected routes
  4. Routers:
     - `/api/transcribe` (with multipart parsing) **before** `express.json`
     - Then `express.json()` for all other routes
     - `/api/auth`, `/api/me`, `/api/organizations`, `/api/patients`, `/api/encounters`, `/api/claims`, `/api/soap`
  5. `auditLogger` for write operations
  6. Global error handler

- `app` is exported from the main module without a listener to support Jest/supertest.

---

## Testing (Jest + supertest)

- Use a dedicated RDS test database with the same schema (migrations applied up to 015).
- Key integration tests:

  - `/api/health`
    - Returns `200` when DB reachable.
    - Fails gracefully when DB/S3 is unavailable.

  - Auth
    - Login success, invalid credentials, and token expiration paths.

  - `/api/me`
    - Creates user on first login, returns existing user on subsequent calls.

  - Organizations
    - GET/PUT `/api/organizations/current` respects auth and org admin rules.
    - Changes are visible on subsequent reads.

  - Patients
    - Full CRUD lifecycle.
    - Org scoping: user in Org A cannot access Org B’s patients.

  - Encounters
    - CRUD lifecycle with `patient_id` and `organization_id` enforcement.
    - Ownership checks: clinicians cannot access encounters from other orgs.

  - Claims
    - List and read scoped by organization.
    - If POST/PUT enabled: correct initial status, valid transitions, org checks.

  - `/api/transcribe`
    - Multipart upload handled correctly.
    - Writes `audio_records` and `ai_results`.
    - Fallback to S3 path works when no audio is sent (mock S3/Whisper).

  - `/api/encounters/:id/soap`
    - POST generates SOAP from transcript (mock/provider-backed flow).
    - GET returns latest SOAP; PUT saves edits.

- Tests can be conditionally skipped when external dependencies (Whisper, AI provider, S3) are not configured, using environment flags.

---

## Open Choices for 1.1.x

- **ai_results Versioning**
  - Append-only with `version` + `is_latest` vs. single-row overwrite per flow/encounter.
- **Audio Retention**
  - Policy for how long raw audio is kept in S3 and whether it’s ever auto-deleted or archived.
- **`/api/health` Exposure**
  - Keep protected (auth-only) vs. allow unauthenticated health check behind network-level controls.
- **Clinician Invite Flow**
  - When and how to expose APIs to invite additional clinicians into an organization.
- **Clearinghouse Integration**
  - Timing and interface (SFTP vs. API) for 837 submission and 835 ingestion; will be modeled via new migrations (`016_...`) and routes when implemented.
