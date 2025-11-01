-- BigQuery Table: ml_training.denial_feedback
-- Purpose: Store 835 ERA denial data for Vertex AI retraining
-- Updated: Weekly by Cloud Function on Sunday 2am UTC

CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.ml_training.denial_feedback` (
  -- Primary identifiers
  era_id STRING NOT NULL,
  claim_id STRING NOT NULL,
  patient_id_hash STRING NOT NULL,  -- SHA-256 hashed, de-identified
  
  -- Payer information
  payer_name STRING NOT NULL,
  payer_id STRING NOT NULL,
  clearinghouse STRING NOT NULL,
  
  -- Denial details
  denial_code STRING NOT NULL,
  denial_group STRING NOT NULL,  -- CO, PR, or OA
  denial_reason STRING NOT NULL,
  denied_amount FLOAT64 NOT NULL,
  
  -- Original claim coding (what we submitted)
  submitted_cpt_codes ARRAY<STRING>,
  submitted_icd_codes ARRAY<STRING>,
  submitted_modifiers ARRAY<STRING>,
  
  -- Transcription analysis (for pattern matching)
  transcription_keywords ARRAY<STRING>,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY denial_code, payer_name
OPTIONS(
  description="835 ERA denial feedback for ML retraining",
  labels=[("purpose", "ml_training"), ("phi_status", "de_identified")]
);

-- Create denial pattern materialized view (updated hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS `${GCP_PROJECT_ID}.ml_training.denial_patterns` AS
SELECT
  denial_code,
  denial_reason,
  denial_group,
  payer_name,
  submitted_cpt_codes,
  submitted_icd_codes,
  transcription_keywords,
  COUNT(*) as denial_count,
  AVG(denied_amount) as avg_denied_amount,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM `${GCP_PROJECT_ID}.ml_training.denial_feedback`
WHERE denial_group = 'CO'  -- Only contractual denials (coding errors)
  AND DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAYS)
GROUP BY 
  denial_code, 
  denial_reason, 
  denial_group, 
  payer_name,
  submitted_cpt_codes,
  submitted_icd_codes,
  transcription_keywords
HAVING denial_count >= 3;  -- Only patterns with 3+ occurrences

-- Create weekly training data export view
CREATE OR REPLACE VIEW `${GCP_PROJECT_ID}.ml_training.weekly_training_export` AS
SELECT
  CONCAT(ARRAY_TO_STRING(transcription_keywords, ' ')) as input_text,
  ARRAY_TO_STRING(submitted_icd_codes, ',') as incorrect_icd,
  ARRAY_TO_STRING(submitted_cpt_codes, ',') as incorrect_cpt,
  denial_reason as correction_guidance,
  denial_count,
  avg_denied_amount as financial_impact
FROM `${GCP_PROJECT_ID}.ml_training.denial_patterns`
WHERE denial_count >= 5  -- High-confidence patterns only
ORDER BY denial_count DESC, avg_denied_amount DESC;
