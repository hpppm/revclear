-- 027_claim_edi_snapshot.sql
-- HIPAA §164.312(c) integrity: store the exact EDI 837P bytes sent to the
-- clearinghouse so post-submit downloads return what was actually submitted,
-- not a re-render of the (possibly mutated) claim row.
--
-- Stored as encrypted text via encryptPHIText (revclear:phi:v1:<iv>:<tag>:<ct>).
-- The EDI string contains PHI (patient name, DOB, dx codes), so it must be
-- encrypted at rest just like the other PHI columns.

ALTER TABLE public.claims
    ADD COLUMN IF NOT EXISTS submitted_edi_encrypted text;

COMMENT ON COLUMN public.claims.submitted_edi_encrypted IS
    'Encrypted snapshot of the EDI 837P string sent to the clearinghouse. '
    'Populated on first successful submit. Decrypt via decryptPHIText. '
    'Returned by GET /api/claims/:id/download once present, instead of rebuilding.';
