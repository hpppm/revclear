-- =========================================================
-- Migration 013: Claim integrity and helpful indexes
-- =========================================================
-- Adds status constraint/default, provider format checks, and JSONB helper indexes.

-- 1) Claim status: enforce known lifecycle values and set a safer default.
ALTER TABLE claims ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE claims DROP CONSTRAINT IF EXISTS check_claims_status;
ALTER TABLE claims ADD CONSTRAINT check_claims_status
  CHECK (status IN ('draft', 'in_progress', 'ready', 'submitted', 'denied', 'paid', 'completed'));

-- 2) Provider identifiers: basic format checks on NPIs and taxonomy codes.
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_npi_format;
ALTER TABLE users ADD CONSTRAINT chk_users_npi_format
  CHECK (npi IS NULL OR npi ~ '^[0-9]{10}$');

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_clinic_npi_format;
ALTER TABLE users ADD CONSTRAINT chk_users_clinic_npi_format
  CHECK (clinic_npi IS NULL OR clinic_npi ~ '^[0-9]{10}$');

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_taxonomy_format;
ALTER TABLE users ADD CONSTRAINT chk_users_taxonomy_format
  CHECK (taxonomy_code IS NULL OR taxonomy_code ~ '^[A-Za-z0-9]{10}$');

-- 3) Helpful partial indexes for JSONB provider lookups on claims.
CREATE INDEX IF NOT EXISTS idx_claims_billing_provider_npi
  ON claims ((billing_provider->>'npi'))
  WHERE billing_provider ? 'npi';
CREATE INDEX IF NOT EXISTS idx_claims_service_facility_npi
  ON claims ((service_facility->>'npi'))
  WHERE service_facility ? 'npi';
CREATE INDEX IF NOT EXISTS idx_claims_rendering_provider_npi
  ON claims ((rendering_provider->>'npi'))
  WHERE rendering_provider ? 'npi';

-- 4) Composite index commonly used in work queues (status + payer).
CREATE INDEX IF NOT EXISTS idx_claims_status_payer ON claims (status, payer_id);
