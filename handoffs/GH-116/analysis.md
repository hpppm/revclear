# Analysis Handoff — 2026-03-16-001

**Date:** 2026-03-16T16:05:00-04:00
**Source Handoff:** `handoffs/GH-116/handoff.md`
**Request Type:** Security Problem
**Severity:** High

---

## Summary
`ai_results.input_json` and `ai_results.output_json` are currently written and read as plaintext JSON even though the project already ships a PHI encryption utility in `backend/src/utils/crypto.ts`. The main gap is the repository layer in `backend/src/db/queries.ts`, which inserts raw JSONB and returns raw rows, plus one direct read in `backend/src/api/routes/transcribe.ts` that bypasses the repository entirely. No schema change is required if encrypted values are stored inside a JSON envelope that remains valid `jsonb`; mixed-mode rollout can be handled by decrypting only rows marked with that envelope and leaving legacy plaintext rows untouched.

---

## Root Cause (for bugs/regressions)
The security gap is not in auth or encounter ownership checks. Those route guards are present in `backend/src/api/routes/transcribe.ts`, `backend/src/api/routes/soap.ts`, and `backend/src/api/routes/codes.ts`.

The real gap is storage handling:
- `backend/src/db/queries.ts` `createAiResult()` inserts `input_json` and `output_json` directly into `ai_results` with no call to `encryptPHI()`.
- `backend/src/db/queries.ts` `getLatestAiResult()` and `getLatestAiResultByFlowNames()` return raw DB JSON with no call to `decryptPHI()`.
- `backend/src/api/routes/transcribe.ts` has a direct `SELECT output_json FROM ai_results ...` path that bypasses the repository helper entirely.
- `backend/src/utils/crypto.ts` already provides `encryptPHI()` / `decryptPHI()`, but nothing in the `ai_results` code path uses them.

Exposure assessment:
- Real exposure: Yes.
- Scope: transcript payloads and SOAP payloads are stored in plaintext in `ai_results`.
- Affected flows confirmed from code: transcript writes, transcript manual edits, SOAP generation, SOAP manual edits, and the dev SOAP route through shared `createAiResult()`.

---

## File Map

### Must change
- `backend/src/db/queries.ts` — central `ai_results` write/read helper; this is the correct place to add encryption-on-write and decrypt-on-read behavior for all shared callers.
- `backend/src/api/routes/transcribe.ts` — contains a direct raw `SELECT output_json FROM ai_results` read that would otherwise keep returning encrypted envelopes instead of plaintext transcript data.
- `backend/src/utils/crypto.ts` — likely the right home for JSON envelope helpers and encrypted-payload detection so encryption logic stays centralized with the existing PHI crypto utility.
- `backend/tests/security/security-fixes.test.ts` or a new focused security test file under `backend/tests/security/` — needed to lock in encryption usage, mixed-mode reads, and prevention of raw direct reads regressing.

### May be affected — verify after changes
- `backend/src/api/routes/soap.ts` — depends on `createAiResult()`, `getLatestAiResult()`, and `getLatestAiResultByFlowNames()`; immediate API responses must remain plaintext after repository changes.
- `backend/src/api/routes/codes.ts` — reads SOAP via `getLatestAiResultByFlowNames()` and will fail if decrypted shape is not preserved.
- `backend/src/api/routes/dev/ai.ts` — writes through `createAiResult()` and should inherit encryption without changing its API response shape.
- `frontend/app/lib/api/transcribe.ts` — contract consumer for `GET /transcribe/:encounterId` and `PUT /transcribe/:encounterId`; no frontend change expected, but response shape must remain identical.
- `frontend/app/lib/api/soap.ts` — contract consumer for SOAP GET/POST/PUT responses; no frontend change expected.
- `frontend/app/lib/api/codes.ts` — indirectly depends on decrypted SOAP reads continuing to work for code matching.

### Reference only — do not modify
- `backend/src/constants/aiFlows.ts` — confirms the supported transcript/SOAP flow names and the mixed SOAP legacy read set.
- `backend/docs/db/revclear_schema_current.sql` — confirms `ai_results.input_json` and `output_json` are `jsonb`, which allows a marker envelope without a migration.
- `backend/src/middleware/audit.ts` — already redacts `input_json` and `output_json` from request logging; useful security context, but not part of the fix.
- `frontend/app/lib/api/transcribe.ts`
- `frontend/app/lib/api/soap.ts`
- `frontend/app/lib/api/codes.ts`

---

## Blast Radius
- High: `backend/src/db/queries.ts` — shared by transcript, SOAP, codes, and dev AI flows. Any serialization mistake here breaks multiple PHI workflows.
- Medium: `backend/src/api/routes/transcribe.ts` — one direct DB read bypass currently exists; if left unchanged, transcript reads will return the encrypted storage envelope instead of the legacy payload shape.
- Medium: `backend/src/api/routes/soap.ts` and `backend/src/api/routes/codes.ts` — these rely on decrypted `output_json` shape staying identical to current plaintext rows.
- Low: frontend API clients — no code change expected, but they are sensitive to response-shape regressions.

Inference from the codebase: use an explicit JSON envelope marker for encrypted rows rather than heuristic detection. A reserved shape such as `{ "__revclear_encrypted": true, "ciphertext": "..." }` keeps the column valid as `jsonb`, allows deterministic mixed-mode reads, and avoids guessing whether arbitrary plaintext JSON should be decrypted.

---

## Execution Sequence

**Step 1: Define encrypted AI result envelope helpers** — Backend
- Files: `backend/src/utils/crypto.ts`
- Action: Add small helpers to serialize PHI-bearing JSON into an explicit encrypted JSON envelope and to reverse that envelope back into parsed JSON. Include detection that only decrypts rows carrying the marker; legacy plaintext JSON must pass through unchanged.
- Verify: Helper behavior is covered by tests for three cases: encrypted payload round-trip, legacy plaintext passthrough, and malformed envelope failure behavior.

**Step 2: Encrypt/decrypt at the shared `ai_results` repository boundary** — Backend
- Files: `backend/src/db/queries.ts`
- Action: Update `createAiResult()` to encrypt `input_json` and `output_json` before insert, then decrypt the returned row before returning it to callers so immediate API responses remain unchanged. Update `getLatestAiResult()` and `getLatestAiResultByFlowNames()` to decrypt repository results on read while preserving legacy plaintext rows.
- Verify: Repository tests or focused security tests confirm inserts send encrypted envelopes to the DB layer and all repository return values keep the original plaintext object shape.
- Depends on: Step 1

**Step 3: Remove the raw transcript read bypass** — Backend
- Files: `backend/src/api/routes/transcribe.ts`
- Action: Replace the direct `SELECT output_json FROM ai_results ...` transcript fetch with the shared repository read helper so transcript reads participate in mixed-mode decryption and preserve the current response payload.
- Verify: Route-level test or regression test confirms `GET /api/transcribe/:encounterId` returns the plaintext transcript object for both encrypted-row fixtures and legacy plaintext fixtures.
- Depends on: Step 2

**Step 4: Add regression coverage for mixed-mode rollout** — Backend Test
- Files: `backend/tests/security/security-fixes.test.ts` or a new `backend/tests/security/ai-results-encryption.test.ts`
- Action: Add tests that lock in the security fix and rollout behavior:
  - `createAiResult()` uses encryption helpers.
  - repository reads decrypt marked rows.
  - legacy plaintext rows still read successfully.
  - transcript and SOAP API response shapes remain unchanged.
- Verify: `cd backend && npm test -- --runInBand` or targeted Jest invocation passes.
- Depends on: Step 3

**Step 5: Build verification** — Backend
- Files: no source changes
- Action: Run backend typecheck/build after the above changes.
- Verify: `cd backend && npm run build` succeeds cleanly.
- Depends on: Step 4

---

## Manual Steps (human action required)
1. Confirm `PHI_ENCRYPTION_KEY` is present and identical across the target runtime environments before rollout — encryption-on-write will refuse to store new PHI if the key is missing, and encrypted reads require the same key — before deployment of Step 2.

---

## Protected Zones
- `backend/src/db/queries.ts` / `ai_results` — PHI table and core clinical workflow storage path — protected zone from intake handoff; explicit review required before implementation proceeds.
- `backend/src/utils/crypto.ts` / `PHI_ENCRYPTION_KEY` handling — security-sensitive encryption path — explicit review required before implementation proceeds.
- Transcript/SOAP routes in `backend/src/api/routes/transcribe.ts` and `backend/src/api/routes/soap.ts` — PHI workflow entry points whose response contracts must not regress.

---

## Do Not Touch
- Patient, subscriber, claim, and non-AI encounter PHI encryption outside `ai_results`
- Frontend routes or frontend data contracts
- Database schema for unrelated PHI tables
- Legacy plaintext backfill/remediation work beyond mixed-mode read compatibility

---

## Constraints
- Preserve all existing API response shapes for transcript and SOAP flows.
- Keep mixed-mode compatibility: marked encrypted rows must decrypt, legacy plaintext rows must still read unchanged.
- Do not use heuristic decryption when an explicit envelope marker can distinguish encrypted rows deterministically.
- Keep SQL parameterized with explicit column lists only.
- Do not log decrypted PHI.
- Do not require a schema migration unless implementation proves the envelope approach cannot work with current `jsonb` columns. Current analysis indicates no migration is needed.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] New `ai_results` writes store encrypted envelopes in both `input_json` and `output_json`, not plaintext clinical content.
- [ ] Legacy plaintext `ai_results` rows still read correctly through transcript and SOAP flows.
- [ ] `GET /api/transcribe/:encounterId` returns the same plaintext transcript shape as before.
- [ ] `GET /api/encounters/:id/soap` returns the same plaintext SOAP shape as before.
- [ ] `POST`/`PUT` transcript and SOAP endpoints still return plaintext payloads immediately after write.
- [ ] `POST /api/encounters/:id/codes/match` still works against decrypted SOAP content.
- [ ] Backend tests pass.
- [ ] Backend build passes.
- [ ] No files outside the approved backend/security scope were modified.

---

## Open Questions
None. The major intake unknowns are resolved by code inspection:
- No additional production AI result writers were found beyond transcript and SOAP paths plus the dev AI route that already shares `createAiResult()`.
- Mixed-mode detection should use an explicit envelope marker rather than heuristics.
