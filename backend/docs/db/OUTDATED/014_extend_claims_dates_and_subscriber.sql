-- =========================================================
-- Migration 012: Add claim-level service dates and subscriber/rendering snapshots
-- =========================================================
-- Purpose: Support richer claim payload (DOS start/end, subscriber, rendering provider).

ALTER TABLE claims ADD COLUMN IF NOT EXISTS service_date_start DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS service_date_end DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS subscriber_relationship TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS subscriber JSONB;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS rendering_provider JSONB;

COMMENT ON COLUMN claims.service_date_start IS 'Date of service (start)';
COMMENT ON COLUMN claims.service_date_end IS 'Date of service (end)';
COMMENT ON COLUMN claims.subscriber_relationship IS 'Relationship of subscriber to patient';
COMMENT ON COLUMN claims.subscriber IS 'Snapshot of subscriber demographics and address';
COMMENT ON COLUMN claims.rendering_provider IS 'Rendering provider snapshot (Type 1 NPI, taxonomy)';
