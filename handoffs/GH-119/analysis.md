# Analysis Handoff — 2026-03-16-001

**Date:** 2026-03-16T21:22:43-0400
**Source Handoff:** `handoffs/GH-119/handoff.md`
**Request Type:** Security Problem
**Severity:** High

---

## Summary
GH-119 is a consolidation and rollout-safety issue across the PHI encryption work delivered in GH-116, GH-117, and GH-118. Code inspection shows the core crypto utility already supports mixed-mode plaintext fallback for both JSON and scalar text fields, but row-level field-set transformation logic is duplicated separately in `db/queries.ts`, `patientService.ts`, `encounterService.ts`, and `claimService.ts`, and the automated coverage remains issue-scoped rather than shared across the three encryption surfaces. Because the current database contains only disposable testing data, no executable migration/backfill is needed now; instead, GH-119 should deliver shared field-transform helpers, stronger consolidated tests, and a documented future backfill plan for non-test environments.

---

## Root Cause (for bugs/regressions)
This is a security hardening and maintainability request rather than a regression. The confirmed gap is duplicated mixed-mode row decryption logic and incomplete rollout documentation/tests across the existing encrypted PHI storage paths.

Evidence from code:
- `backend/src/utils/crypto.ts` already has the core mixed-mode primitives:
  - `encryptPHIJson` / `decryptPHIJson`
  - `encryptPHIText` / `decryptPHIText`
  - explicit envelope/prefix detection for legacy plaintext fallback
- `backend/src/db/queries.ts` manually decrypts `ai_results.input_json` and `output_json` with local row helpers (`decryptAiResultRow`, `decryptOptionalAiResultRow`).
- `backend/src/services/patientService.ts` manually iterates configured field sets through a local `transformEncryptedFields(...)` helper to decrypt patient/subscriber rows.
- `backend/src/services/encounterService.ts` manually decrypts `chief_complaint` in a local `decryptEncounterRow(...)`.
- `backend/src/services/claimService.ts` manually decrypts configured JSONB snapshot fields in a local `decryptClaimRow(...)`.
- Existing tests prove each issue in isolation:
  - `backend/tests/security/ai-results-encryption.test.ts`
  - `backend/tests/security/phi-field-encryption.test.ts`
  - `backend/tests/security/claim-snapshot-encryption.test.ts`
- No remaining production-path plaintext bypasses were found inside the GH-116/117/118 scope:
  - `backend/src/api/routes/dev/db.ts` and `backend/src/api/routes/dev/ai.ts` already align with GH-117 rules
  - `backend/src/scripts/test_claim_gen.ts` already aligns with GH-118 rules
  - `backend/src/api/routes/transcribe.ts` already reads `ai_results` through the shared repository helper from GH-116

Inference from current repo + developer clarification:
- There is no present need for a real backfill/migration because the database only contains testing data.
- Mixed-mode reads must remain in place indefinitely, so any future backfill plan is operational documentation, not a prerequisite for current implementation.

---

## File Map

### Must change
- `backend/src/utils/crypto.ts` — best location for shared PHI field-transform helpers because the core mixed-mode primitives already live here.
- `backend/src/db/queries.ts` — should consume the shared helper for `ai_results` row decryption instead of local duplicated row wrappers.
- `backend/src/services/patientService.ts` — should replace local row-transform duplication with the shared helper for patient/subscriber encrypted text fields.
- `backend/src/services/encounterService.ts` — should consume the shared helper or a shared single-field transform wrapper for `chief_complaint`.
- `backend/src/services/claimService.ts` — should replace local JSONB row-transform duplication with the shared helper for persisted claim snapshot fields.
- `backend/tests/security/` — add or reshape coverage so the shared helper behavior is exercised across GH-116/117/118 encryption paths.
- `backend/docs/` — add a short PHI rollout/backfill plan document stating that no immediate backfill is required for test-only data and describing the future process for non-test environments.

### May be affected — verify after changes
- `backend/src/api/routes/dev/db.ts` — imports patient encryption exports; verify helper extraction does not break dev patient CRUD.
- `backend/src/api/routes/dev/ai.ts` — verify helper extraction does not affect dev encounter scaffolding assumptions.
- `backend/src/api/routes/transcribe.ts` — verify GH-116 transcript read path still goes through decrypted `ai_results` values.
- `backend/tests/security/ai-results-encryption.test.ts` — may need small updates if repository-level row decryption helper names change.
- `backend/tests/security/phi-field-encryption.test.ts` — may need updates if patient/encounter helper exports or internals change.
- `backend/tests/security/claim-snapshot-encryption.test.ts` — may need updates if claim helper internals change.

### Reference only — do not modify
- `backend/src/api/routes/claims.ts` — route contract and auth/organization scoping should remain unchanged.
- `backend/src/api/routes/patients.ts` — route contract should remain unchanged.
- `backend/src/api/routes/encounters.ts` — route contract should remain unchanged.
- `backend/docs/db/revclear_schema_current.sql` — reference only; no schema change or migration is recommended for GH-119.
- `frontend/app/lib/api/claims.ts` — frontend contract consumer only, not expected to change.
- `frontend/app/lib/api/encounters.ts` — frontend preview consumer only, not expected to change.
- `frontend/app/components/wizard/ReviewClaimStep.tsx` — high-dependency claim review consumer; use only for regression reference.

---

## Execution Sequence

**Step 1: Add shared mixed-mode field-transform helpers** — Backend
- Files: `backend/src/utils/crypto.ts`
- Action: Add small shared helpers that apply `decryptPHIJson` / `decryptPHIText` across configured field sets on row objects, with null-safe mixed-mode behavior. Keep them generic enough to serve GH-116 (`ai_results` JSON), GH-117 (patient/subscriber text fields and `chief_complaint`), and GH-118 (claim snapshot JSON fields) without changing response shapes.
- Verify: focused unit-style tests or updated security tests prove shared helpers preserve plaintext legacy values and decrypt only marked encrypted fields.

**Step 2: Replace duplicated row decryption logic in scoped repositories/services** — Backend
- Files: `backend/src/db/queries.ts`, `backend/src/services/patientService.ts`, `backend/src/services/encounterService.ts`, `backend/src/services/claimService.ts`
- Action: Refactor those files to consume the shared helper(s) instead of maintaining local row-transform implementations. Preserve existing exports used by dev routes and claim preview logic.
- Verify: existing GH-116/117/118 tests still pass and code inspection confirms no production-path read bypasses were reintroduced.
- Depends on: Step 1

**Step 3: Expand and consolidate automated security coverage** — Backend Test
- Files: `backend/tests/security/ai-results-encryption.test.ts`, `backend/tests/security/phi-field-encryption.test.ts`, `backend/tests/security/claim-snapshot-encryption.test.ts`, and/or one new shared test file under `backend/tests/security/`
- Action: Ensure automated coverage explicitly verifies:
  - encrypted writes still occur on the three scoped storage models
  - legacy plaintext fallback still works on the three scoped storage models
  - the new shared helper behavior is exercised, not just the old issue-local wrappers
  - unchanged plaintext API/preview contract shape still holds after decryption
- Verify: `cd backend && npm test -- --runInBand`
- Depends on: Step 2

**Step 4: Document the no-backfill-now / future-backfill plan** — Documentation
- Files: new doc under `backend/docs/` (recommended: `backend/docs/phi-rollout-plan.md`) and optionally `backend/docs/README.md` if you want to link it
- Action: Document that no executable backfill is required now because the database contains only test data. Include the future operational plan for non-test environments:
  - confirm `PHI_ENCRYPTION_KEY`
  - keep mixed-mode reads enabled
  - identify plaintext rows by scoped tables/columns
  - rewrite plaintext rows through app-safe encryption logic or controlled SQL/app script
  - verify counts and sample reads
  - retain mixed-mode support after completion
- Verify: visual review confirms the repo now contains a clear future backfill playbook and explicitly states that GH-119 does not require running one now.
- Depends on: Step 3

**Step 5: Build verification** — Backend
- Files: none
- Action: Run backend tests/build and repo-level frontend build after the helper/test/doc changes.
- Verify:
  - `cd backend && npm test -- --runInBand`
  - `cd backend && npm run build`
  - `cd frontend && npm run build`
- Depends on: Step 4

---

## Manual Steps (human action required)
1. Confirm `PHI_ENCRYPTION_KEY` is present and identical across target environments before any future real-data backfill — required for safe encryption writes — before any non-test rollout.

---

## Protected Zones
- `backend/src/utils/crypto.ts` — central PHI encryption utility used by all scoped storage paths; any mistake affects GH-116/117/118 simultaneously.
- PHI-bearing persisted data paths in `ai_results`, `patients`, `insurance_subscribers`, `encounters`, and `claims` — protected because they store regulated healthcare data.
- Route/API contracts consumed by frontend patient/encounter/claim flows — protected application contract; response shapes must remain unchanged.

---

## Do Not Touch
- Any PHI systems outside GH-116, GH-117, and GH-118 scope.
- Database schema and migrations for GH-119; no new schema work is recommended.
- Frontend API contracts and response shapes.
- Removal of mixed-mode plaintext fallback.

---

## Constraints
- Preserve all existing API response shapes for the GH-116/117/118 routes and preview flows.
- Mixed-mode reads must remain supported indefinitely; do not turn GH-119 into a plaintext-fallback removal issue.
- Reuse existing explicit JSON/text envelope detection; do not invent a new encryption format.
- Keep SQL parameterized with explicit column lists.
- Do not log decrypted PHI.
- Do not introduce a runnable backfill script unless implementation discovers a concrete need that contradicts the current “test data only” environment assumption.
- If helper extraction would force broad export/interface churn, prefer a small shared utility over a sweeping architecture rewrite.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] Shared mixed-mode helper(s) exist and are used by the GH-116, GH-117, and GH-118 repository/service decryption paths.
- [ ] `ai_results` encrypted writes still work and legacy plaintext `ai_results` rows still read correctly.
- [ ] Patient/subscriber/chief complaint encrypted writes still work and legacy plaintext rows still read correctly.
- [ ] Persisted claim snapshot encrypted writes still work and legacy plaintext claim rows still read correctly.
- [ ] `/api/patients`, `/api/encounters`, persisted `/api/claims`, and claim preview responses still return plaintext objects/fields with unchanged shape.
- [ ] Backend tests pass.
- [ ] Backend build passes.
- [ ] Frontend build passes.
- [ ] The repo now contains a documented future backfill plan that explicitly says no immediate backfill is required for the current test-only database.
- [ ] Only approved backend utility/service/test/doc files were modified.

---

## Open Questions
None. Analysis recommends no executable backfill for the current repo state; if the environment later contains real historical plaintext PHI, that becomes a future operational rollout task rather than a blocker for GH-119 implementation.
