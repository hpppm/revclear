# Analysis

## Current state
- `GET /api/claims/:id/download` → `ClaimService.downloadEdi` ([backend/src/services/claimService.ts:300](../../backend/src/services/claimService.ts)).
- `downloadEdi` calls `findById` → `buildEdi837String(claim, orgEdi)` → returns text.
- `submitClaim` ([backend/src/services/claimService.ts:229](../../backend/src/services/claimService.ts)) calls `submitClaimToClearinghouse(claim, orgEdi)`. The clearinghouse service builds a Stedi JSON payload from the claim — it does NOT use `buildEdi837String`. So the X12 string was never persisted.

## Problem
EDI is regenerated on every download. A claim row mutated after submit (e.g. resubmission edits, manual fixes) yields a different EDI on the next download. The "downloaded EDI" stops matching what was actually transmitted.

This is the HIPAA §164.312(c) integrity issue — the inability to verify, after the fact, that a record has not been improperly altered.

## Encryption choice
The EDI 837P contains PHI: patient name, DOB, address, dx codes, payer info. Storing it as plaintext at rest would violate the same controls we already enforce on `subscriber`, `billing_provider`, etc.

We use `encryptPHIText` from [backend/src/utils/crypto.ts](../../backend/src/utils/crypto.ts). It produces a `revclear:phi:v1:<iv>:<tag>:<ct>` string, AES-256-GCM, key from `PHI_ENCRYPTION_KEY`. Same primitive already used elsewhere in the codebase, so no new key-management surface.

## Why a column, not a separate table
- One snapshot per claim is sufficient for the integrity guarantee on the **most recent** transmission — which is what a clinician needs for the current denial/appeal cycle.
- `claim_status_history` already tracks the chain of submit attempts (timestamps, statuses, reasons). If we later want per-attempt EDI bytes, that's where it would extend.
- Avoids a second table just to solve "regenerate vs snapshot" for the common case.

## Decision points
1. **Snapshot timing** — snapshot on every successful clearinghouse call, regardless of accept/deny/pending. All three mean "bytes left our system" and the clinician may need them for appeals.
2. **Resubmission** — overwrite. The column reflects the most-recent transmitted bytes; the status history preserves the audit trail.
3. **Legacy claims** (submitted before this column existed) — `submitted_edi_encrypted` is `NULL`. `downloadEdi` falls back to rebuilding from the row, same as today. Not a regression; will become the canonical snapshot the next time the claim is submitted.
