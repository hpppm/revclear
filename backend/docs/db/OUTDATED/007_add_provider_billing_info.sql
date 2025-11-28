-- =========================================================
-- Migration 007: Add Provider Billing Information
-- =========================================================
-- Purpose: Add fields required for ANSI X12 837 claim generation
-- Provider information: NPI, Tax ID, Clinic details

ALTER TABLE users ADD COLUMN IF NOT EXISTS npi TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_address_street TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_address_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_address_state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_address_zip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS practitioner_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_id TEXT;

-- Add index for NPI lookups
CREATE INDEX IF NOT EXISTS idx_users_npi ON users(npi);

-- Add comments for documentation
COMMENT ON COLUMN users.npi IS 'National Provider Identifier (10-digit)';
COMMENT ON COLUMN users.tax_id IS 'Tax ID (EIN or SSN) for billing';
COMMENT ON COLUMN users.clinic_name IS 'Clinic or practice name';
COMMENT ON COLUMN users.practitioner_type IS 'Type of practitioner (e.g., Psychologist, Physical Therapist)';
COMMENT ON COLUMN users.license_id IS 'State license number';
