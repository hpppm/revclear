# Ship report

## What shipped
- Migration `027_claim_edi_snapshot.sql` adds `claims.submitted_edi_encrypted text`.
- `ClaimService.submit` encrypts and persists the EDI 837P string on every clearinghouse send.
- `ClaimService.downloadEdi` returns the stored snapshot (decrypted) when present, falling back to rebuild for pre-submit / legacy claims.
- Schema snapshot updated.

## How to verify
1. Apply migration `027_claim_edi_snapshot.sql` to AWS RDS.
2. Create a new claim end-to-end and submit it.
3. `SELECT id, status, submitted_edi_encrypted IS NOT NULL FROM claims WHERE id = <new id>;` — should be `t`.
4. Download the EDI via the UI — should match the just-sent bytes.
5. Edit the underlying claim (e.g., change a CPT code via PATCH).
6. Download again — bytes still match the original transmission, NOT the edited claim.
7. Re-submit the claim. Download — now reflects the new transmitted bytes.

## Risks / known gaps
- Legacy claims (submitted before this column existed) keep the old rebuild-on-download behavior until they are submitted again. Not a regression — same behavior they had before this change.
- This change does NOT lock down post-submit edits to the `claims` row itself. Editing a submitted claim and *not* resubmitting will leave the snapshot as-of-last-submit while the row drifts. That's intentional — drift visibility is a separate UX concern. A follow-up should block edits on submitted claims (or surface "this claim has uncommitted edits since last submission" in the UI).
- Existing dual-scope gap on `ClaimService.delete` (only `organization_id`, not `clinician_id`) is unchanged — out of scope here.
