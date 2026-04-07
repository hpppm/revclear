# Analysis Handoff — 2026-03-16-002

**Date:** 2026-03-16T17:22:00-04:00
**Source Handoff:** `handoffs/GH-117/handoff.md`
**Request Type:** Security Problem
**Severity:** High

---

## Summary
GH-117 extends PHI-at-rest protection beyond `ai_results` into patient demographics, insurance subscriber data, and encounter clinical text stored directly in relational tables. Code inspection confirms the current patient, subscriber, and encounter storage paths write and return plaintext values from `patients`, `insurance_subscribers`, and `encounters.chief_complaint`, and multiple backend paths read those same columns directly for patient screens, claim generation, and dev tooling. Unlike GH-116, this work is not repository-only: if PHI fields such as `dob`, `gender`, and possibly `insurance_relationship` are encrypted in place, the current schema blocks it, so a database migration is required before backend changes.

---

## Root Cause (for bugs/regressions)
This is a security hardening request rather than a regression. The confirmed security gap is plaintext PHI storage in relational table columns outside `ai_results`.

Evidence from code and schema:
- `backend/src/services/patientService.ts` inserts, updates, and selects patient PHI columns directly from `patients`.
- `backend/src/services/patientService.ts` inserts, updates, and selects subscriber PHI columns directly from `insurance_subscribers`.
- `backend/src/services/encounterService.ts` inserts, updates, and returns `encounters.chief_complaint` directly.
- `backend/src/services/claimService.ts` independently reads patient and subscriber PHI directly from `patients` and `insurance_subscribers` for claim preview/payload generation.
- `backend/src/api/routes/dev/db.ts` and `backend/src/api/routes/dev/ai.ts` directly write/read `patients`, bypassing service-layer logic.
- `backend/src/utils/crypto.ts` provides reusable PHI encryption/decryption primitives, but none of the above table paths currently use them.

Schema constraints that materially affect implementation:
- `patients.dob` and `insurance_subscribers.dob` are currently `date` columns.
- `patients.gender` has a check constraint allowing only `M/F/U/O/null`.
- `patients.insurance_relationship` has a check constraint allowing only `self/spouse/child/other/null`.
- Text fields such as `full_name`, address fields, policy/member/group numbers, payer/provider names, and `encounters.chief_complaint` can store encrypted strings without a type change.

Inference from code + schema:
- No additional encounter clinical text fields beyond `chief_complaint` are stored directly on `encounters` in the current schema.
- Transcript and SOAP narrative content already live in `ai_results` and were covered by GH-116.

---

## File Map

### Must change
- `backend/docs/db/` — a new migration file is required here because in-place encryption of typed/constrained PHI fields cannot work against the current schema.
- `backend/src/utils/crypto.ts` — extend the existing PHI utility with helpers suitable for text-column field encryption and mixed-mode plaintext/encrypted reads.
- `backend/src/services/patientService.ts` — primary patient/subscriber repository layer; patient CRUD and subscriber upsert/read must encrypt writes and decrypt reads.
- `backend/src/services/encounterService.ts` — `chief_complaint` write/read path must encrypt on write and decrypt on read while preserving response shape.
- `backend/src/services/claimService.ts` — claim preview/generation reads patient and subscriber PHI directly; it must read decrypted values or route through shared decrypting accessors.
- `backend/src/api/routes/dev/db.ts` — direct `patients` read/write/update paths bypass service-layer logic and must stay compatible with encrypted fields.
- `backend/src/api/routes/dev/ai.ts` — direct patient inserts for dev encounter scaffolding bypass service-layer logic and must stay compatible with encrypted fields.
- `backend/tests/security/` — new focused security coverage is needed for patient/subscriber/chief complaint encryption and mixed-mode reads.

### May be affected — verify after changes
- `backend/src/api/routes/patients.ts` — contracts should remain unchanged, but it depends entirely on `PatientService`.
- `backend/src/api/routes/encounters.ts` — contracts should remain unchanged, but it depends on `EncounterService`.
- `backend/src/types/zod.ts` — request validation likely stays the same, but date/gender/relationship handling must be checked after schema changes.
- `frontend/app/lib/api/patients.ts` — contract consumer for patient/subscriber CRUD; no frontend contract change expected.
- `frontend/app/lib/api/encounters.ts` — contract consumer for `chief_complaint`; no frontend contract change expected.
- `frontend/app/lib/types/index.ts` — frontend types for patient/encounter data should remain stable.

### Reference only — do not modify
- `backend/docs/db/revclear_schema_current.sql` — source of truth for current column types and constraints.
- `backend/src/middleware/audit.ts` — confirms these fields are already treated as sensitive in logging.
- `hipaa_checklist.md` — confirms PHI-at-rest treatment expectations and minimum-necessary handling context.
- `handoffs/GH-116/analysis.md` — reference pattern for legacy-compatible mixed-mode read rollout.

---

## Recommended Encrypted Column Set

Based on schema and code usage, the recommended in-scope encrypted columns for GH-117 are:

### `patients`
- `full_name`
- `dob`
- `gender`
- `phone`
- `email`
- `address_street`
- `address_city`
- `address_state`
- `address_zip`
- `insurance_provider`
- `insurance_policy_number`
- `insurance_member_id`
- `insurance_group_number`
- `insurance_payer_name`
- `insurance_relationship`
- `plan_name`

### `insurance_subscribers`
- `full_name`
- `dob`
- `gender`
- `phone`
- `address_street`
- `address_city`
- `address_state`
- `address_zip`
- `member_id`
- `group_number`
- `plan_name`

### `encounters`
- `chief_complaint`

### Recommended plaintext operational fields
- Primary keys and foreign keys: `id`, `patient_id`, `subscriber_id`, `clinician_id`, `organization_id`, `primary_clinician_id`, `transcript_result_id`, `soap_result_id`
- Non-sensitive scoping/routing/operational fields: `status`, `date_of_service`, `place_of_service`, `encounter_type`, `audio_key`, `insurance_payer_id`

Reasoning:
- These plaintext fields are used for ownership checks, joins, sorting/filtering, or clearinghouse routing.
- No patient/encounter frontend search or backend ownership logic currently depends on plaintext patient names or plaintext `chief_complaint`.

---

## Blast Radius
- High: `backend/src/services/patientService.ts` — central patient/subscriber CRUD path used by `/api/patients` and patient detail screens.
- High: `backend/src/services/claimService.ts` — claim preview depends on patient/subscriber demographic and insurance data; wrong decryption here breaks a core billing workflow.
- High: `backend/docs/db/` migration — changing DOB types and relaxing enum-style constraints affects PHI tables directly.
- Medium: `backend/src/services/encounterService.ts` — encounter detail reads and updates must preserve `chief_complaint` behavior while moving storage to encrypted text.
- Medium: `backend/src/api/routes/dev/db.ts` and `backend/src/api/routes/dev/ai.ts` — direct patient table access becomes a plaintext bypass if left unchanged.
- Low: frontend patient/encounter API consumers — contract should remain unchanged if backend decrypts before responding.

Dependent call sites confirmed from code:
- `patients.ts` uses `PatientService`
- `encounters.ts` uses `EncounterService`
- `claims.ts` uses `ClaimService`
- `claimService.ts`, `dev/db.ts`, and `dev/ai.ts` currently bypass a shared patient/subscriber repository abstraction

Risk assessment:
- Overall risk is High because this changes PHI storage in core clinical/demographic tables and intersects with billing payload generation.

---

## Protected Zones
- `patients`, `insurance_subscribers`, `encounters` — PHI tables and core clinical workflow storage paths
- `backend/src/utils/crypto.ts` / `PHI_ENCRYPTION_KEY` handling — security-sensitive encryption path
- `backend/src/middleware/*` patterns and SQL safety rules — must keep organization/clinician scoping and parameterization intact
- RDS/PostgreSQL schema in `backend/docs/db/` — migration affects production data representation

---

## Execution Sequence

**Step 1: Write the schema migration for typed/constrained PHI columns** — Database Migration
- Files: new file in `backend/docs/db/` (next sequential migration number)
- Action: Create a migration that enables in-place encrypted storage for the recommended field set. At minimum:
  - alter `patients.dob` and `insurance_subscribers.dob` from `date` to `text` while preserving existing plaintext values in `YYYY-MM-DD` form
  - drop constraints that would reject encrypted payloads for encrypted enum-like fields (at least `check_gender`; also `check_insurance_relationship` if `insurance_relationship` is encrypted)
- Verify: migration SQL is idempotent/safe to review and leaves plaintext legacy rows readable after cast/conversion.
- Blocks: all backend encryption steps

**Step 2: Extend crypto helpers for field-level text encryption and mixed-mode reads** — Backend
- Files: `backend/src/utils/crypto.ts`
- Action: Add helpers for encrypting a single scalar PHI field into a text-safe envelope and for decrypting only marked encrypted text while passing legacy plaintext values through unchanged.
- Verify: helper tests cover encrypted round-trip, plaintext passthrough, and invalid envelope failure behavior.
- Depends on: Step 1

**Step 3: Encrypt/decrypt patient and subscriber storage at the service layer** — Backend
- Files: `backend/src/services/patientService.ts`
- Action: Encrypt the recommended in-scope patient/subscriber PHI fields on create/update/upsert, and decrypt them on all patient/subscriber reads and enrich paths before returning data to routes/callers. Keep IDs, scoping fields, and `insurance_payer_id` plaintext.
- Verify: patient/subscriber service tests or focused security tests confirm mixed-mode reads and unchanged response shape.
- Depends on: Step 2

**Step 4: Encrypt/decrypt encounter clinical text storage** — Backend
- Files: `backend/src/services/encounterService.ts`
- Action: Encrypt `chief_complaint` on create/update and decrypt it on encounter reads before returning API responses.
- Verify: encounter service or route-level tests confirm plaintext API contract is preserved for encrypted and legacy plaintext rows.
- Depends on: Step 2

**Step 5: Update direct patient/subscriber consumers and bypasses** — Backend
- Files: `backend/src/services/claimService.ts`, `backend/src/api/routes/dev/db.ts`, `backend/src/api/routes/dev/ai.ts`
- Action: Ensure claim preview/generation and dev-only patient paths read/write through the encrypted/decrypted field rules rather than bypassing them with raw plaintext table access.
- Verify: claim preview path still receives decrypted patient/subscriber data; dev routes remain compatible if kept in scope.
- Depends on: Steps 3 and 4

**Step 6: Add mixed-mode regression coverage** — Backend Test
- Files: new focused test file under `backend/tests/security/` and/or related service tests
- Action: Add tests for:
  - encrypted patient writes and decrypted patient reads
  - encrypted subscriber writes and decrypted subscriber reads
  - encrypted `chief_complaint` writes and decrypted encounter reads
  - legacy plaintext passthrough
  - claim-service compatibility with decrypted patient/subscriber reads
- Verify: `cd backend && npm test -- --runInBand`
- Depends on: Step 5

**Step 7: Build verification** — Backend
- Files: none
- Action: Run backend build after all service/test changes.
- Verify: `cd backend && npm run build`
- Depends on: Step 6

---

## Manual Steps (human action required)
1. Apply the DB migration before deploying backend code that assumes encrypted in-place storage for DOB/constraint-bound fields.
2. Confirm `PHI_ENCRYPTION_KEY` is present and identical across target runtime environments before rollout.

---

## Do Not Touch
- IDs, foreign keys, and non-sensitive operational scoping fields that must remain plaintext
- `ai_results` encryption scope already handled in GH-116
- Claims table snapshots and unrelated PHI systems not explicitly named in GH-117
- Frontend API contracts and response shapes unless a regression forces investigation

---

## Constraints
- Preserve all existing API response shapes for patient, subscriber, and encounter routes.
- Support mixed-mode reads: encrypted rows and legacy plaintext rows must both work during rollout.
- Do not rely on heuristic decryption; use an explicit text envelope marker for encrypted scalar values.
- Keep SQL parameterized with explicit column lists.
- Do not log decrypted PHI.
- Treat `insurance_payer_id` as plaintext operational/routing data unless implementation discovers an actual search/routing-safe alternative.
- No backfill of existing plaintext rows is required for GH-117; mixed-mode compatibility is the rollout strategy unless the developer explicitly re-scopes the issue.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] New `patients` writes encrypt the recommended PHI fields while keeping IDs/foreign keys/scoping fields plaintext.
- [ ] New `insurance_subscribers` writes encrypt the recommended PHI fields while keeping `id` and `patient_id` plaintext.
- [ ] New `encounters` writes encrypt `chief_complaint` while preserving other operational fields.
- [ ] Legacy plaintext patient, subscriber, and encounter rows still read correctly.
- [ ] `/api/patients` and `/api/patients/:id` return plaintext patient/subscriber payloads identical in shape to current responses.
- [ ] `/api/encounters` and `/api/encounters/:id` return plaintext `chief_complaint` values identical in shape to current responses.
- [ ] Claim preview/generation still works with decrypted patient/subscriber data.
- [ ] Backend tests pass.
- [ ] Backend build passes.
- [ ] Only approved files plus the new migration/test files were modified.

---

## Open Questions
- If the developer wants backfill of existing plaintext patient/subscriber/encounter rows as part of GH-117, that is a scope expansion beyond this mixed-mode rollout plan and should be confirmed before implementation.
