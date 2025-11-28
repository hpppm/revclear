-- =========================================================
-- Migration 011: Add Provider and Facility Snapshots to Claims
-- =========================================================
-- Purpose: Store a snapshot of the billing provider and service facility details
-- directly on the claim to ensure immutability and completeness for billing.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS billing_provider JSONB;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS service_facility JSONB;

-- Comments
COMMENT ON COLUMN claims.billing_provider IS 'Snapshot of provider details (NPI, Tax ID, Address) at time of claim creation';
COMMENT ON COLUMN claims.service_facility IS 'Snapshot of facility details (Name, NPI, Address) at time of claim creation';
