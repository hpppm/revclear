-- =========================================================
-- Migration 013: Add encounter_type and chief_complaint to encounters
-- =========================================================

ALTER TABLE encounters ADD COLUMN IF NOT EXISTS encounter_type TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS chief_complaint TEXT;

COMMENT ON COLUMN encounters.encounter_type IS 'Type of encounter (office_visit, telehealth, etc.)';
COMMENT ON COLUMN encounters.chief_complaint IS 'Chief complaint for the visit';
