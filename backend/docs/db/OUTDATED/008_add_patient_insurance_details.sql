-- =========================================================
-- Migration 008: Add Patient Insurance & Address Details
-- =========================================================
-- Purpose: Add complete patient information for claim generation
-- Insurance details: Member ID, Group Number, Payer info
-- Address: Full address for claim submission

ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_member_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_group_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_payer_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_payer_name TEXT;

-- Update gender constraint to standard codes
ALTER TABLE patients DROP CONSTRAINT IF EXISTS check_gender;
ALTER TABLE patients ADD CONSTRAINT check_gender 
  CHECK (gender IN ('M', 'F', 'U', 'O', NULL));

-- Add comments
COMMENT ON COLUMN patients.insurance_member_id IS 'Insurance member/subscriber ID';
COMMENT ON COLUMN patients.insurance_group_number IS 'Insurance group number';
COMMENT ON COLUMN patients.insurance_payer_id IS 'Payer ID for clearinghouse routing';
COMMENT ON COLUMN patients.insurance_payer_name IS 'Insurance payer name';
COMMENT ON CONSTRAINT check_gender ON patients IS 'M=Male, F=Female, U=Unknown, O=Other';
