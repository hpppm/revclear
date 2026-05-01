# Implementation

## DB migration
[backend/docs/db/027_claim_edi_snapshot.sql](../../backend/docs/db/027_claim_edi_snapshot.sql)

```sql
ALTER TABLE public.claims
    ADD COLUMN IF NOT EXISTS submitted_edi_encrypted text;
```

Schema snapshot at [backend/docs/db/revclear_schema_current.sql](../../backend/docs/db/revclear_schema_current.sql) updated to include the column on the `claims` table definition.

## Service: snapshot at submission
[backend/src/services/claimService.ts](../../backend/src/services/claimService.ts) — `submit`:

1. Build the EDI string with `buildEdi837String(claim, orgEdi)` BEFORE calling the clearinghouse — this is the canonical "what we are about to send."
2. After `submitClaimToClearinghouse` returns (accepted | denied | pending), encrypt the EDI string via `encryptPHIText` and persist it in the same `UPDATE` that flips `status` and `submission_date`.
3. Re-submissions overwrite the column (current bytes-on-the-wire); `claim_status_history` keeps the chain of attempts.

## Service: serve snapshot on download
[backend/src/services/claimService.ts](../../backend/src/services/claimService.ts) — `downloadEdi`:

1. After the dual-scope `findById` lookup, fetch `submitted_edi_encrypted` for the same `(id, organization_id)`.
2. If present and matches the `revclear:phi:v1:` envelope → `decryptPHIText` and return.
3. Otherwise (pre-submit / legacy) → fall back to `buildEdi837String` from the current row.

## What the route owner does NOT need to change
- `GET /api/claims/:id/download` route handler at [backend/src/api/routes/claims.ts:163](../../backend/src/api/routes/claims.ts) is unchanged — same contract, same response envelope.
- Frontend `apiClient.claims.download` is unchanged.

## Migration deployment
Apply `027_claim_edi_snapshot.sql` against the shared AWS RDS database before merging. The column is nullable, so the change is forward-compatible — old code reading rows without the column keeps working, and new code falls back to rebuild when the column is null.
