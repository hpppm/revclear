# Backend Plan — RevClear v1.0.0

This document captures the planned production-facing backend routes, flows, and behaviors (no `/api/dev` dependencies).

## Scope

- Public API roots: `/api/auth`, `/api/patients`, `/api/encounters`, `/api/claims`, `/api/transcribe`, `/api/soap`, `/api/me`, `/api/health`.
- DB: Postgres (RDS) using `patients`, `encounters`, `audio_records`, `ai_results`, `claims`, `users`.
- Storage: S3 for audio/media blobs; DB for structured results (transcripts, SOAP).
- Validation: Zod for incoming payloads/params; return structured 4xx on validation issues.
- Auth: protect all routes except login/register and health.

## Route Plan

- `/api/auth/*` — existing auth flows.
- `/api/me` — returns current user from `users`; create on first login if missing.
- `/api/health` — lightweight health (DB ping, S3 check).
- `/api/patients` — CRUD (create/read/update/delete) with Zod validation.
- `/api/encounters` — CRUD tied to patients; includes linking to audio/transcripts/ai_results.
- `/api/claims` — list/read (create if available); returns 2xx/4xx only.
- `/api/transcribe`
  - Accepts multipart audio upload; mount BEFORE `express.json`.
  - If request carries audio: stream directly to Whisper (no S3 download).
  - If no audio stream (e.g., page refresh): fetch audio from S3 (via stored key) and feed Whisper.
  - Keep original audio in S3; record `audio_records` entry with S3 key and status.
  - Persist transcript to `ai_results` (`flow_name=whisper_transcript`, `input_json` includes S3 key).
  - Optional: store transcript JSON copy in S3. (not needed for v1.0.0)
- `/api/soap` and `/api/encounters/:id/soap`
  - POST: run Genkit/Gemini using transcript (prefer DB `ai_results` over S3 fetch); allow regenerate.
  - GET: fetch latest SOAP for encounter.
  - PUT: save edits to SOAP output.
  - Persist SOAP to `ai_results` (`flow_name=soap_gemini`; versioning optional) and optionally to S3.

## Flows

### Encounter lifecycle

1. User picks patient → creates new encounter (`/api/encounters` POST).
2. Upload/record audio:
   - Upload to `/api/transcribe` (multipart), store audio in S3, create `audio_records`.
   - If transcribe immediately: stream audio to Whisper; else, audio key stays in DB for later.
3. Transcription:
   - Use request stream when present; else pull from S3 using stored key.
   - Save transcript in `ai_results` (source of truth); optional S3 JSON snapshot.
4. SOAP generation:
   - `/api/encounters/:id/soap` POST: fetch transcript from DB, call Genkit/Gemini, save SOAP in `ai_results`.
   - Frontend can “Generate again” (re-run) or “Save” edits (PUT updates `ai_results`).
5. Claims:
   - Expose list/read (and create if available) via `/api/claims`.

### Data storage

- Audio: S3 (keep original for now); `audio_records` references key/status.
- Transcript/SOAP: DB `ai_results` (`flow_name` variants). S3 copies optional.

### Error handling

- Zod validation → 400 with structured error.
- No stack traces in responses; log server-side.
- Auth enforced on all protected routes; `/api/health` optionally public.

### Middleware

- Load env via `setupEnv`.
- Order: transcribe router before `express.json`; then `express.json`, `cors`, `helmet` (CSP), `morgan`, `auditLogger`.

## Testing (Jest + supertest)

- Export `app` for testing (no listener).
- Integration coverage:
  - `/api/health` returns 200 (DB up; optional S3 check).
  - Auth: login happy/unauthorized.
  - Patients CRUD lifecycle.
  - Encounters CRUD lifecycle.
  - Claims list/read (create if implemented).
  - `/api/transcribe`: multipart upload returns transcript shape (mock Whisper if needed); ensure fallback to S3 works.
  - `/api/encounters/:id/soap`: GET/POST/PUT happy paths (mock Genkit if needed).
- Guard tests to skip when required env not set; use RDS test DB.

## Open Choices

- Versioning strategy for `ai_results` (append vs. overwrite).
- Whether to delete/move audio post-transcription (currently keep).
- Public vs. protected `/api/health`. (Protected for v1.0.0)
