-- =========================================================
-- Migration 012: Add Insurance Subscribers
-- =========================================================
-- Purpose: Store subscriber details separate from patient when patient is not the subscriber.

CREATE TABLE IF NOT EXISTS insurance_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  member_id TEXT,
  group_number TEXT,
  plan_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES insurance_subscribers(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_relationship TEXT DEFAULT 'self';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- Constraints
ALTER TABLE patients DROP CONSTRAINT IF EXISTS check_insurance_relationship;
ALTER TABLE patients ADD CONSTRAINT check_insurance_relationship
  CHECK (insurance_relationship IN ('self', 'spouse', 'child', 'other', NULL));

-- Index to quickly find subscriber by patient
CREATE INDEX IF NOT EXISTS idx_subscribers_patient ON insurance_subscribers(patient_id);
