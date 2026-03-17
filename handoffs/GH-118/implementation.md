# Implementation Handoff — 2026-03-16-001

**Date:** 2026-03-16T16:09:46-0400
**Source Analysis:** `handoffs/GH-118/analysis.md`
**Request Type:** Security Problem
**Severity:** High
**Build Status:** CLEAN ✓

---

## What Was Built
GH-118 now encrypts the persisted claim snapshot JSONB fields that carry provider and subscriber PHI: `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber`. The claim repository decrypts those fields transparently on read, supports mixed-mode legacy plaintext rows, leaves operational claim fields plaintext, and preserves the existing `/api/claims` and claim-preview response shapes.

I also aligned the direct claim test script so it no longer inserts plaintext provider snapshots, and added focused regression coverage for encrypted persisted claim writes, mixed-mode persisted reads, and unchanged preview payload shape.

---

## Steps Completed

### Step 1: Add claim snapshot encryption/decryption helpers at the repository boundary ✅
- Files modified: `backend/src/services/claimService.ts`
- What changed: Added the exact encrypted claim snapshot field set plus local helpers that encrypt those JSONB fields on write and decrypt them on read using the existing JSON envelope helpers from `crypto.ts`.
- Verified with: visual code review plus `cd backend && npx jest --config jest.config.ts --runInBand tests/security/claim-snapshot-encryption.test.ts --verbose`

### Step 2: Encrypt persisted claim snapshot writes and transparently decrypt persisted claim reads ✅
- Files modified: `backend/src/services/claimService.ts`
- What changed: Updated persisted claim `create()`, `update()`, `findAll()`, `findById()`, and `getClaimByEncounter()` to encrypt/decrypt the four PHI-bearing snapshot fields while leaving IDs, claim status, payer fields, dates, line items, and coding fields plaintext.
- Verified with: `cd backend && npx jest --config jest.config.ts --runInBand tests/security/claim-snapshot-encryption.test.ts --verbose`

### Step 3: Decide and handle the direct plaintext bypass script ✅
- Files modified: `backend/src/scripts/test_claim_gen.ts`
- What changed: Chose the safer production-readiness path and aligned the direct claim test script with encrypted claim snapshot storage so it no longer inserts plaintext provider snapshots.
- Verified with: visual code review of the script import and insert params

### Step 4: Add mixed-mode regression coverage for claim snapshots ✅
- Files modified: `backend/tests/security/claim-snapshot-encryption.test.ts`
- What changed: Added focused tests for encrypted claim snapshot writes on create/update, mixed-mode decryption of encrypted and legacy plaintext persisted claims, and unchanged plaintext preview payload shape.
- Verified with: `cd backend && npm test -- --runInBand`

### Step 5: Build verification ✅
- Files modified: none
- What changed: Ran the backend test/build flow and the repo-level frontend build after the claim snapshot changes.
- Verified with:
  - `cd backend && npm test -- --runInBand`
  - `cd backend && npm run build`
  - `cd frontend && npm run build`

---

## Steps Skipped or Deferred
- No implementation steps from the analysis handoff were skipped.

---

## Files Modified
- `backend/src/services/claimService.ts` — encrypted persisted claim snapshot writes and added transparent mixed-mode decryption on persisted claim reads.
- `backend/src/scripts/test_claim_gen.ts` — aligned the direct claim insert script with encrypted provider snapshot storage.
- `backend/tests/security/claim-snapshot-encryption.test.ts` — added GH-118 security regression coverage.

---

## Files NOT Modified (confirmed)
- `backend/src/api/routes/claims.ts` — protected route contract and auth/organization scoping preserved, not modified ✓
- `backend/src/types/zod.ts` — claim schema shape preserved, not modified ✓
- `frontend/app/lib/api/claims.ts` — frontend claim API contract preserved, not modified ✓
- `frontend/app/lib/api/encounters.ts` — preview API contract preserved, not modified ✓
- `frontend/app/components/wizard/ReviewClaimStep.tsx` — high-dependency frontend claim review consumer preserved, not modified ✓
- `frontend/app/dashboard/claims/page.tsx` — claim list UI preserved, not modified ✓
- `backend/src/utils/crypto.ts` — reused existing JSON envelope helpers, not modified ✓
- `backend/docs/db/revclear_schema_current.sql` — reference only, not modified ✓
- `backend/docs/db/013_claim_integrity_and_indexes.sql` — reference only, not modified ✓

---

## Manual Steps Completed by Developer
- None

## Manual Steps Still Required
- Confirm `PHI_ENCRYPTION_KEY` is present and identical across target runtime environments before rollout.

---

## Open Questions Resolved
1. `Which persisted claim snapshot fields are actually in scope?` → Implemented encryption for `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber`, which are the PHI-bearing persisted claim snapshot fields confirmed in analysis.
2. `Is a migration required for claim snapshot encryption?` → No. Those fields are already `jsonb`, so the existing encrypted JSON envelope works without a schema change.
3. `What should happen with the direct plaintext claim bypass script?` → It was aligned with encrypted snapshot storage rather than left as a documented plaintext bypass.
4. `Do provider-NPI helper indexes block the rollout?` → No active app path uses them, so the rollout proceeds without schema work; the limitation is documented because newly encrypted provider snapshots will no longer expose indexable `npi` subkeys.

---

## Build Verification
- Backend tests: CLEAN
- Backend TypeScript/build: CLEAN
- Frontend build: CLEAN
- Commands run:
  - `cd backend && npx jest --config jest.config.ts --runInBand tests/security/claim-snapshot-encryption.test.ts --verbose`
  - `cd backend && npm test -- --runInBand`
  - `cd backend && npm run build`
  - `cd frontend && npm run build` (rerun with network access because the sandbox blocks Google Fonts fetches)

---

## Known Limitations
- Existing plaintext persisted claim rows remain readable by design; GH-118 does not backfill or rewrite historical claim snapshots.
- Newly encrypted provider snapshots will no longer expose plaintext `npi` subkeys for the existing helper JSONB indexes, although no active application query path currently depends on those indexes.

---

## Verification Checklist for Agent 4
- [ ] New persisted claim writes encrypt `billing_provider`, `service_facility`, `rendering_provider`, and `subscriber`.
- [ ] Persisted claim reads (`/api/claims`, `/api/claims/:id`, and existing-claim preview path) return plaintext snapshot objects identical in shape to current responses.
- [ ] Legacy plaintext persisted claim rows still read correctly.
- [ ] Claim preview generation still returns plaintext provider/subscriber snapshot objects before persistence.
- [ ] Claim create/update flows still work without changing frontend claim review behavior.
- [ ] Backend tests pass.
- [ ] Backend build passes.
- [ ] Frontend build passes.
- [ ] Only approved files were modified, plus the new focused test file.
