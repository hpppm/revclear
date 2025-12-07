-- =========================================================
-- Migration 016: Remove redundant clinic fields from users table
-- =========================================================
-- This migration safely removes clinic_* fields from users table
-- after ensuring all data is preserved in the organizations table.
--
-- IMPORTANT: This migration assumes that:
-- 1. All users have been assigned to an organization via organization_memberships
-- 2. Organization data has been populated from user clinic_* fields (if needed)
--
-- Run this AFTER verifying data integrity!

-- =========================================================
-- STEP 1: Data Integrity Check (run this first, review output)
-- =========================================================

-- Check for users with clinic data but NO organization membership
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.clinic_name,
  u.clinic_npi,
  COUNT(om.id) as org_count
FROM users u
LEFT JOIN organization_memberships om ON u.id = om.user_id
WHERE (
  u.clinic_name IS NOT NULL 
  OR u.clinic_npi IS NOT NULL
  OR u.clinic_address_street IS NOT NULL
)
GROUP BY u.id, u.email, u.full_name, u.clinic_name, u.clinic_npi
HAVING COUNT(om.id) = 0;

-- If the above query returns ANY rows, DO NOT proceed!
-- Those users need to be assigned to organizations first.

-- =========================================================
-- STEP 2: Backup existing clinic data (optional but recommended)
-- =========================================================

-- Create a backup table to preserve the original clinic_* data
CREATE TABLE IF NOT EXISTS users_clinic_backup AS
SELECT 
  id,
  email,
  clinic_name,
  clinic_address_street,
  clinic_address_city,
  clinic_address_state,
  clinic_address_zip,
  clinic_phone,
  clinic_npi,
  created_at as backed_up_at
FROM users
WHERE clinic_name IS NOT NULL 
   OR clinic_npi IS NOT NULL
   OR clinic_address_street IS NOT NULL;

-- =========================================================
-- STEP 3: Remove redundant columns from users table
-- =========================================================

-- These fields are now ONLY in the organizations table
ALTER TABLE users
  DROP COLUMN IF EXISTS clinic_name,
  DROP COLUMN IF EXISTS clinic_address_street,
  DROP COLUMN IF EXISTS clinic_address_city,
  DROP COLUMN IF EXISTS clinic_address_state,
  DROP COLUMN IF EXISTS clinic_address_zip,
  DROP COLUMN IF EXISTS clinic_phone,
  DROP COLUMN IF EXISTS clinic_npi;

-- =========================================================
-- STEP 4: Verify the cleanup
-- =========================================================

-- Check that users table no longer has clinic_* columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name LIKE 'clinic_%';
-- Should return 0 rows

-- =========================================================
-- STEP 5: Document what remains in users table
-- =========================================================

COMMENT ON TABLE users IS 'Clinician/user accounts with personal provider credentials. Clinic information is stored in organizations table.';

COMMENT ON COLUMN users.npi IS 'Personal Type 1 NPI for individual provider (different from organization NPI)';
COMMENT ON COLUMN users.tax_id IS 'Personal tax ID (SSN/EIN) for individual provider billing or 1099 reporting';
COMMENT ON COLUMN users.practitioner_type IS 'Provider specialty: Mental Health, Speech Therapy, Physical Therapy, etc.';
COMMENT ON COLUMN users.license_id IS 'State professional license number';
COMMENT ON COLUMN users.taxonomy_code IS 'Personal NUCC provider taxonomy code (10 alphanumeric)';
COMMENT ON COLUMN users.provider_role IS 'Role in claims: rendering, billing, or both';

-- =========================================================
-- NOTES:
-- =========================================================
-- 
-- What was removed (now in organizations table):
--   - clinic_name → organizations.name
--   - clinic_address_street → organizations.address_line1
--   - clinic_address_city → organizations.city
--   - clinic_address_state → organizations.state
--   - clinic_address_zip → organizations.postal_code
--   - clinic_phone → organizations.phone
--   - clinic_npi → organizations.npi (Type 2 organizational NPI)
--
-- What remains in users (personal provider data):
--   - npi (personal Type 1 NPI)
--   - tax_id (personal SSN/EIN)
--   - license_id (state license)
--   - practitioner_type (specialty)
--   - taxonomy_code (provider taxonomy)
--   - provider_role (rendering/billing/both)
--
-- To get clinic information for a user:
--   SELECT o.* 
--   FROM organizations o
--   JOIN organization_memberships om ON o.id = om.organization_id
--   WHERE om.user_id = $1;
--
