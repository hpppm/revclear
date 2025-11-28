-- =========================================================
-- Migration 010: Extend Claims Table for Complete Billing
-- =========================================================
-- Purpose: Add all fields required for ANSI X12 837 claim generation
-- Payer info, claim types, line items with detailed billing

ALTER TABLE claims ADD COLUMN IF NOT EXISTS payer_id TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_type TEXT DEFAULT 'professional';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'initial';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS patient_responsibility NUMERIC(10,2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS line_items JSONB;

-- Add constraints for claim type validation
ALTER TABLE claims DROP CONSTRAINT IF EXISTS check_claim_type;
ALTER TABLE claims ADD CONSTRAINT check_claim_type 
  CHECK (claim_type IN ('professional', 'institutional'));

ALTER TABLE claims DROP CONSTRAINT IF EXISTS check_submission_type;
ALTER TABLE claims ADD CONSTRAINT check_submission_type 
  CHECK (submission_type IN ('initial', 'corrected', 'void'));

-- Add index for payer lookups
CREATE INDEX IF NOT EXISTS idx_claims_payer_id ON claims(payer_id);

-- Add comments
COMMENT ON COLUMN claims.payer_id IS 'Clearinghouse payer ID for routing';
COMMENT ON COLUMN claims.payer_name IS 'Insurance payer name';
COMMENT ON COLUMN claims.claim_type IS 'professional (CMS-1500) or institutional (UB-04)';
COMMENT ON COLUMN claims.submission_type IS 'initial, corrected, or void';
COMMENT ON COLUMN claims.patient_responsibility IS 'Patient copay/deductible amount';
COMMENT ON COLUMN claims.line_items IS 'Array of line items with procedure codes, charges, units, modifiers';

-- Example line_items structure:
-- [
--   {
--     "line_number": 1,
--     "procedure_code": "99213",
--     "modifiers": ["25"],
--     "diagnosis_pointers": [1],
--     "units": 1,
--     "charge_amount": 150.00,
--     "place_of_service": "11",
--     "date_of_service": "2024-01-15"
--   }
-- ]
