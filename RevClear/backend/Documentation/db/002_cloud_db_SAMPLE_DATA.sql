-- =========================================================
-- 🌱 Medical Billing System - Seed Data (Non-PHI)
-- =========================================================

-- 👨‍💼 Admin User
INSERT INTO users (id, email, full_name, role)
VALUES (
  gen_random_uuid(),
  'admin@medbill.dev',
  'System Admin',
  'admin'
);

-- 👩‍⚕️ Sample Clinician
INSERT INTO users (id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dr.jane@example.com',
  'Dr. Jane Doe',
  'clinician'
);

-- 👩‍🦰 Sample Patients
INSERT INTO patients (id, clinician_id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'John Smith', '1985-03-22', 'male', '+1-555-123-4567', 'john.smith@example.com', 'Blue Cross Blue Shield', 'BCBS-908273'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Mary Johnson', '1978-11-05', 'female', '+1-555-234-7890', 'mary.johnson@example.com', 'Aetna', 'AET-550981');

-- 🩺 Encounters (SOAP drafts)
INSERT INTO encounters (id, patient_id, clinician_id, date_of_service, subjective, objective, assessment, plan, status, ai_confidence)
SELECT
  gen_random_uuid(),
  p.id,
  '00000000-0000-0000-0000-000000000001',
  NOW() - (INTERVAL '1 day' * s.i),
  'Patient reports mild cough and fatigue.',
  'Vitals stable, lungs clear.',
  'Suspected viral infection.',
  'Rest, fluids, OTC medication.',
  'review',
  0.92
FROM patients p
JOIN generate_series(1, 2) s(i) ON TRUE
LIMIT 2;

-- 🎙️ Audio Record (Metadata Only)
INSERT INTO audio_records (encounter_id, file_url, duration_seconds, transcription_status)
SELECT e.id, 'gs://medical-billing-data/audio/sample_' || e.id || '.wav', 180, 'completed'
FROM encounters e
LIMIT 2;

-- 🤖 AI Results (SOAP & Coding Outputs)
INSERT INTO ai_results (encounter_id, flow_name, input_json, output_json, model_version, confidence_score)
SELECT e.id, 'generateSOAP.flow.ts',
  '{"transcript": "Patient reports mild cough..."}'::jsonb,
  '{"subjective": "Mild cough", "objective": "Lungs clear", "assessment": "Viral infection", "plan": "Rest"}'::jsonb,
  'gemini-pro-1.0', 0.93
FROM encounters e
LIMIT 2;

INSERT INTO ai_results (encounter_id, flow_name, input_json, output_json, model_version, confidence_score)
SELECT e.id, 'extractCodes.flow.ts',
  '{"soap": {"assessment": "Viral infection"}}'::jsonb,
  '{"icd10": ["J06.9"], "cpt": ["99213"]}'::jsonb,
  'gemini-pro-1.0', 0.98
FROM encounters e
LIMIT 2;

-- 💼 Claims (AI-generated)
INSERT INTO claims (encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status)
SELECT e.id, e.clinician_id, e.patient_id, ARRAY['J06.9'], ARRAY['99213'], 120.00, 'Blue Cross Blue Shield', 'ready'
FROM encounters e
LIMIT 2;

-- 🧠 AI Feedback (Training Data)
INSERT INTO ai_feedback (claim_id, encounter_id, ai_codes, final_codes, status, rejection_reason, model_version)
SELECT c.id, c.encounter_id,
  '{"icd": ["J06.9"], "cpt": ["99213"]}'::jsonb,
  '{"icd": ["J06.9"], "cpt": ["99214"]}'::jsonb,
  'rejected',
  'Insufficient documentation for Level 4 visit',
  'gemini-pro-1.0'
FROM claims c
LIMIT 1;

-- 🔔 Notifications
INSERT INTO notifications (user_id, title, message, type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Claim Ready', 'A new claim for John Smith is ready for submission.', 'info'),
  ('00000000-0000-0000-0000-000000000001', 'Claim Feedback', 'Claim for Mary Johnson was rejected due to insufficient documentation.', 'warning');

-- 👁️ Verify
SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM patients) AS total_patients,
  (SELECT COUNT(*) FROM encounters) AS total_encounters,
  (SELECT COUNT(*) FROM claims) AS total_claims;


-- 
-- 🧠 Developer Notes
-- Category	Description
-- Safety	Contains no real PHI — purely synthetic data
-- Purpose	For testing API endpoints, AI flows, and dashboards
-- Reset	You can truncate and reseed anytime using TRUNCATE ... RESTART IDENTITY CASCADE;
-- Usage	Run inside Cloud SQL (or via proxy) with: psql -h 127.0.0.1 -d medical -f seed.sql
-- Auth Integration	The clinician dr.jane@example.com should also exist in Firebase Auth for login consistency
