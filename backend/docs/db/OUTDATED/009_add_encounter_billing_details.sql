-- =========================================================
-- Migration 009: Add Encounter Billing Details
-- =========================================================
-- Purpose: Add billing-specific encounter information
-- Place of Service, Audio references, AI result tracking

ALTER TABLE encounters ADD COLUMN IF NOT EXISTS place_of_service TEXT DEFAULT '11';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS audio_key TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS transcript_result_id UUID REFERENCES ai_results(id);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS soap_result_id UUID REFERENCES ai_results(id);

-- Add constraint for valid POS codes (2-digit codes)
ALTER TABLE encounters DROP CONSTRAINT IF EXISTS check_pos;
ALTER TABLE encounters ADD CONSTRAINT check_pos 
  CHECK (place_of_service ~ '^[0-9]{2}$');

-- Add indexes for AI result lookups
CREATE INDEX IF NOT EXISTS idx_encounters_transcript_result ON encounters(transcript_result_id);
CREATE INDEX IF NOT EXISTS idx_encounters_soap_result ON encounters(soap_result_id);
CREATE INDEX IF NOT EXISTS idx_encounters_audio_key ON encounters(audio_key);

-- Add comments
COMMENT ON COLUMN encounters.place_of_service IS 'Place of Service code (11=Office, 12=Home, 02=Telehealth, etc.)';
COMMENT ON COLUMN encounters.audio_key IS 'S3 key for audio file';
COMMENT ON COLUMN encounters.transcript_result_id IS 'Reference to AI transcription result';
COMMENT ON COLUMN encounters.soap_result_id IS 'Reference to AI SOAP generation result';
