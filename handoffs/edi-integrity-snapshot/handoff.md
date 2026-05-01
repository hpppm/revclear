# EDI Integrity Snapshot

## Goal
Make the EDI 837P file returned by `GET /api/claims/:id/download` byte-identical to what was actually transmitted to the clearinghouse, satisfying HIPAA §164.312(c) (Integrity).

## Why now
Today the download endpoint **rebuilds** the EDI string from the current claim row each time it is called. If any field on the claim is edited after submission (codes, subscriber info, dates, line items), the file the clinician downloads no longer matches what the payer received. That breaks the integrity control and undermines audit/appeal workflows.

## Scope
- DB: add `claims.submitted_edi_encrypted` column (encrypted text).
- Backend: snapshot encrypted EDI on every clearinghouse send; serve snapshot on download when present.
- No frontend changes.
- No change to who can download (post-submit visibility for the submitting clinician/org is HIPAA-compliant under TPO).

## Out of scope
- Per-attempt EDI history (currently overwritten on resubmit; `claim_status_history` already tracks the chain of attempts).
- Post-submit edit lockdown on the `claims` row itself (separate concern, tracked under "submitted-claim immutability").
- Existing dual-scope gap on `delete()` (also separate).
