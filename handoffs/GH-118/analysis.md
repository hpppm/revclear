# Analysis Handoff — 2026-03-16-001

**Date:** 2026-03-16T16:03:11-0400
**Source Handoff:** `handoffs/GH-118/handoff.md`
**Request Type:** Security Problem
**Severity:** High

---

## Summary
GH-118 extends PHI-at-rest protection into persisted claim snapshot fields on `claims`, specifically the JSONB snapshot columns that currently store subscriber and provider details in plaintext. Code inspection shows the claim repository writes `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber` directly into `claims` and returns them directly from all persisted claim read paths with no encryption or mixed-mode handling. Because those fields are already `jsonb`, GH-118 does not require a type-conversion migration; the existing encrypted JSON envelope from GH-116 can be reused for transparent mixed-mode reads.

Important schema caveat: `claims` currently has helper partial indexes on `billing_provider->>'npi'`, `service_facility->>'npi'`, and `rendering_provider->>'npi'`. No active application query path uses those indexes, so they do not block GH-118, but fully encrypted provider snapshots will stop contributing new rows to those indexes unless the issue is explicitly re-scoped to preserve plaintext queryable subfields.

---

## Root Cause (for bugs/regressions)
This is a security hardening request rather than a regression. The confirmed security gap is plaintext PHI-bearing claim snapshot storage in `claims`.

Evidence from code and schema:
- `backend/src/services/claimService.ts` inserts and updates `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber` by `JSON.stringify(...)` and returns them unchanged on read.
- `backend/src/services/claimService.ts` returns persisted claims unchanged from `findAll`, `findById`, and `getClaimByEncounter`, so any encrypted storage must be transparently decrypted there to preserve API contracts.
- `backend/src/services/claimService.ts` builds preview payloads in plaintext from decrypted patient/subscriber data and organization/clinician data; preview is not persisted unless `create()` is called.
- `backend/docs/db/revclear_schema_current.sql` defines `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber` as `jsonb`, which can hold an explicit encrypted JSON envelope without a type change.
- `backend/docs/db/013_claim_integrity_and_indexes.sql` adds partial indexes for `billing_provider->>'npi'`, `service_facility->>'npi'`, and `rendering_provider->>'npi'`.
- `backend/src/scripts/test_claim_gen.ts` directly inserts plaintext claim snapshots and bypasses `ClaimService`.

Inference from code + schema:
- The exact in-scope PHI-bearing persisted claim snapshot fields are `subscriber`, `billing_provider`, `service_facility`, and `rendering_provider`. Other claim fields such as `payer_id`, `payer_name`, `status`, `claim_type`, `submission_type`, `service_date_*`, and IDs are operational and should remain plaintext for this issue.
- No application code currently queries `claims` by provider NPI; the NPI JSONB indexes appear to be schema-level helpers rather than active runtime dependencies.

---

## File Map

### Must change
- `backend/src/services/claimService.ts` — primary persisted claim repository; claim snapshot JSONB writes must encrypt and persisted claim reads must decrypt in mixed mode.
- `backend/tests/security/` — new focused coverage is required for encrypted claim snapshot writes, mixed-mode persisted reads, and existing preview/create compatibility.

### May be affected — verify after changes
- `backend/src/api/routes/claims.ts` — route contracts should remain unchanged, but it depends entirely on `ClaimService`.
- `backend/src/types/zod.ts` — schemas likely remain unchanged, but claim snapshot object validation must still accept the decrypted response shape.
- `frontend/app/lib/api/claims.ts` — no contract changes expected, but claim create/update consumers depend on unchanged response shape.
- `frontend/app/lib/api/encounters.ts` — claim preview route contract must remain unchanged.
- `frontend/app/components/wizard/ReviewClaimStep.tsx` — heavily consumes previewed claim snapshot fields and depends on plaintext object shape.
- `frontend/app/dashboard/claims/page.tsx` — persisted claims list should remain unaffected because only non-snapshot summary fields are displayed.
- `backend/src/scripts/test_claim_gen.ts` — direct plaintext bypass to `claims`; decide whether to align it with encrypted storage or leave it explicitly out of scope as a non-production test script.

### Reference only — do not modify
- `backend/src/utils/crypto.ts` — reuse existing `encryptPHIJson`, `decryptPHIJson`, and `isEncryptedPHIJson` helpers; no utility changes are required unless implementation discovers a helper gap.
- `backend/tests/security/ai-results-encryption.test.ts` — reference for encrypted JSON envelope and mixed-mode test style.
- `backend/docs/db/revclear_schema_current.sql` — reference only; no schema change required for the recommended rollout.
- `backend/docs/db/013_claim_integrity_and_indexes.sql` — reference for the existing provider-NPI helper indexes that implementation must not accidentally break with a migration.

---

## Execution Sequence

**Step 1: Add claim snapshot encryption/decryption helpers at the repository boundary** — Backend
- Files: `backend/src/services/claimService.ts`
- Action: Define the exact encrypted claim snapshot field set (`billing_provider`, `service_facility`, `rendering_provider`, `subscriber`) and add local helpers that encrypt those fields on write and decrypt those same fields on read using the existing JSON envelope helpers from `crypto.ts`. Support mixed-mode reads so plaintext legacy rows continue to work.
- Verify: code inspection confirms all persisted claim read methods (`findAll`, `findById`, `getClaimByEncounter`) and write methods (`create`, `update`) route through the helpers.

**Step 2: Encrypt persisted claim snapshot writes and transparently decrypt persisted claim reads** — Backend
- Files: `backend/src/services/claimService.ts`
- Action: Update `create()` and `update()` so the four JSONB snapshot columns are stored as encrypted envelopes instead of plaintext JSON. Update `findAll()`, `findById()`, and `getClaimByEncounter()` to decrypt the four snapshot columns before returning claims. Keep IDs, foreign keys, claim status, payer fields, dates, line items, diagnosis/procedure codes, and other operational fields plaintext.
- Verify: focused tests confirm encrypted DB params for new writes and unchanged plaintext API shape for persisted claim reads.
- Depends on: Step 1

**Step 3: Decide and handle the direct plaintext bypass script** — Backend
- Files: `backend/src/scripts/test_claim_gen.ts`
- Action: Either update the script to insert encrypted claim snapshot JSONB values through the same helper logic, or explicitly leave it untouched and document that it is a non-production manual test script that still writes plaintext. The safer production-readiness posture is to align it.
- Verify: if updated, code inspection confirms it no longer inserts plaintext provider snapshots; if left untouched, the implementation handoff must explicitly call it out as a remaining non-production bypass.
- Depends on: Step 2

**Step 4: Add mixed-mode regression coverage for claim snapshots** — Backend Test
- Files: new focused test file under `backend/tests/security/`
- Action: Add tests for:
  - encrypted JSON claim snapshot write params in `ClaimService.create()`
  - encrypted JSON claim snapshot update params in `ClaimService.update()`
  - mixed-mode decryption of encrypted and legacy plaintext persisted claims in `findById()` / `getClaimByEncounter()`
  - unchanged preview payload shape from `getPreview()` and unchanged persisted claim API shape after decryption
  - optional direct-script/bypass coverage if Step 3 updates the script
- Verify: `cd backend && npm test -- --runInBand`
- Depends on: Steps 2 and 3

**Step 5: Build verification** — Backend
- Files: none
- Action: Run backend build after the claim service/test changes, then run the repo-level frontend build because claim preview and claim routes are shared with existing frontend flows.
- Verify:
  - `cd backend && npm run build`
  - `cd frontend && npm run build`
- Depends on: Step 4

---

## Manual Steps (human action required)
1. Confirm `PHI_ENCRYPTION_KEY` is present and identical across target runtime environments before rollout — claim snapshot writes will fail closed without it — before deploy.

---

## Protected Zones
- `claims` persisted data path — PHI-bearing production table with audit triggers — approval required before changing claim snapshot storage behavior.
- `backend/src/api/routes/claims.ts` auth/organization scoping path — protected security boundary; contracts and middleware must remain intact even if route code is not modified.
- Claim API response contracts consumed by the frontend preview/review flow — protected application contract; approval required before changing shape, which GH-118 should avoid.

---

## Do Not Touch
- `frontend` claim API contracts and response shapes.
- Claim IDs, foreign keys, `status`, `payer_id`, `payer_name`, `claim_type`, `submission_type`, `service_date_start`, `service_date_end`, timestamps, and other operational routing/scoping fields.
- `line_items`, `diagnosis_codes`, and `procedure_codes` unless implementation discovers a confirmed PHI-at-rest requirement for them beyond GH-118’s stated snapshot scope.
- Database schema and migrations, unless implementation is explicitly re-scoped to preserve plaintext/indexable provider subfields.

---

## Constraints
- Preserve all existing `/api/claims` and claim preview response shapes.
- Support mixed-mode reads: encrypted persisted claim rows and legacy plaintext rows must both work during rollout.
- Reuse the explicit encrypted JSON envelope marker from `crypto.ts`; do not invent a second JSON envelope format.
- Keep SQL parameterized with explicit column lists; do not introduce `SELECT *` or `RETURNING *` into client-facing claim paths.
- Do not log decrypted claim snapshot PHI.
- Do not change auth middleware, route scoping, or Zod contract shape unless a regression forces investigation.
- Treat the provider-NPI helper indexes as an implementation constraint: they are not used by current app code, but fully encrypted provider snapshots will no longer expose queryable `npi` subkeys for new rows.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] New persisted claim writes encrypt `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber`.
- [ ] Persisted claim reads (`/api/claims`, `/api/claims/:id`, and existing-claim preview path) return plaintext snapshot objects identical in shape to current responses.
- [ ] Legacy plaintext persisted claim rows still read correctly.
- [ ] Claim preview generation still returns plaintext provider/subscriber snapshot objects before persistence.
- [ ] Claim create/update flows still work without changing frontend claim review behavior.
- [ ] Backend tests pass.
- [ ] Backend build passes.
- [ ] Frontend build passes.
- [ ] Only approved files were modified, plus any new focused test file.

---

## Open Questions
- If the developer wants provider `npi` or other non-PHI provider subfields to remain queryable/indexable in plaintext inside persisted claim snapshots, GH-118 needs a different storage design than “encrypt the whole JSONB snapshot.” Current application code does not require that, but the existing schema indexes suggest it may matter later.
