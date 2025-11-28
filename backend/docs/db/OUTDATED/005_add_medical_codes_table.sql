-- =========================================================
-- 🏥 Medical Codes Table Migration
-- Add medical_codes table for storing user-selected ICD/CPT codes
-- =========================================================

CREATE TABLE IF NOT EXISTS medical_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  code_type TEXT NOT NULL CHECK (code_type IN ('ICD', 'CPT')),
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_ai_suggested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_medical_codes_encounter ON medical_codes(encounter_id);
CREATE INDEX idx_medical_codes_type ON medical_codes(code_type);

COMMENT ON TABLE medical_codes IS 'Stores user-selected medical billing codes (ICD-10 diagnosis and CPT procedure codes) for encounters';
COMMENT ON COLUMN medical_codes.code_type IS 'Type of code: ICD (diagnosis) or CPT (procedure)';
COMMENT ON COLUMN medical_codes.confidence_score IS 'AI confidence score (0-1) if code was AI-suggested';
COMMENT ON COLUMN medical_codes.is_ai_suggested IS 'TRUE if code came from AI suggestions, FALSE if manually added';
