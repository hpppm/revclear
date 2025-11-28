-- =========================================================
-- Migration 010: Add provider taxonomy, clinic NPI, and role flags
-- =========================================================
-- Purpose: Capture payer-required provider metadata

ALTER TABLE users ADD COLUMN IF NOT EXISTS taxonomy_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_npi TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_role TEXT;

COMMENT ON COLUMN users.taxonomy_code IS 'NUCC provider taxonomy code (10 alphanumeric)';
COMMENT ON COLUMN users.clinic_npi IS 'Organization/clinic NPI (10-digit), optional';
COMMENT ON COLUMN users.provider_role IS 'Provider role for claims: rendering/billing/both';
