-- =========================================================
-- 🔄 Schema Refactor: Clean Up Encounters Table
-- Remove duplicate SOAP columns and add references to ai_results
-- =========================================================

-- Step 1: Drop the dependent view
DROP VIEW IF EXISTS clinician_encounters CASCADE;

-- Step 2: Add new reference columns
ALTER TABLE encounters 
ADD COLUMN IF NOT EXISTS transcript_result_id UUID REFERENCES ai_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS soap_result_id UUID REFERENCES ai_results(id) ON DELETE SET NULL;

-- Step 3: Drop old SOAP columns (data now lives in ai_results)
ALTER TABLE encounters 
DROP COLUMN IF EXISTS subjective,
DROP COLUMN IF EXISTS objective,
DROP COLUMN IF EXISTS assessment,
DROP COLUMN IF EXISTS plan,
DROP COLUMN IF EXISTS ai_confidence;

-- Step 4: Add indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_encounters_transcript_result ON encounters(transcript_result_id);
CREATE INDEX IF NOT EXISTS idx_encounters_soap_result ON encounters(soap_result_id);

-- Step 5: Recreate the view without the SOAP columns
CREATE VIEW clinician_encounters AS
SELECT 
  e.id,
  e.patient_id,
  e.clinician_id,
  e.date_of_service,
  e.status,
  e.transcript_result_id,
  e.soap_result_id,
  e.created_at,
  e.updated_at
FROM encounters e
WHERE clinician_id = current_setting('app.current_user_id', true)::uuid;

COMMENT ON VIEW clinician_encounters IS 'Filtered view of encounters for the current clinician';

-- =========================================================
-- New Data Model:
-- encounters → references ai_results via transcript_result_id & soap_result_id
-- ai_results → stores actual transcript and SOAP data in output_json
-- medical_codes → stores user-selected codes, references encounters
-- =========================================================
