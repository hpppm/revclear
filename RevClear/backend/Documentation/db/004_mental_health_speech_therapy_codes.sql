-- Mental Health and Speech-Language Pathology CPT Codes
-- RevClear Healthcare Management System
-- Includes CCI Edits (Correct Coding Initiative) for proper billing

-- ============================================
-- SPEECH-LANGUAGE PATHOLOGY CPT CODES
-- ============================================

INSERT INTO cpt_codes (code, description, duration_minutes, category, base_rate, is_timed) VALUES
-- Speech and Language Services
('92507', 'Speech and Language Treatment, Individual', 15, 'Speech Therapy', 50.00, false),
('92508', 'Speech Group', 15, 'Speech Therapy', 25.00, false),
('92521', 'Evaluation of Speech Fluency', 30, 'Speech Evaluation', 85.00, false),
('92522', 'Evaluation of Speech Production', 30, 'Speech Evaluation', 85.00, false),
('92523', 'Evaluation of Speech Production; with Evaluation of Language Comprehension and Expression', 45, 'Speech Evaluation', 125.00, false),
('92524', 'Behavioral and Qualitative Analysis of Voice & Resonance', 30, 'Speech Evaluation', 90.00, false),
('92526', 'Treatment of Swallowing Dysfunction', 15, 'Speech Therapy', 55.00, false),
('92597', 'Evaluation of Voice Prosthetic', 30, 'Speech Evaluation', 80.00, false),
('92607', 'Evaluation of Speech Generating Device', 30, 'Speech Evaluation', 95.00, true),
('92608', 'Eval of Speech Device (additional 1/2 hour)', 30, 'Speech Evaluation', 50.00, true),
('92609', 'Training and Fitting for Device', 30, 'Speech Therapy', 75.00, false),
('92611', 'Radiopaque Swallow Study', 45, 'Speech Evaluation', 150.00, false),
('92612', 'Flexible Endoscopic Swallow Eval', 30, 'Speech Evaluation', 175.00, false),
('92614', 'Flexible Fiberoptic Endoscopic Evaluation, laryngeal sensory testing by cine or video recording', 30, 'Speech Evaluation', 180.00, false),
('92616', 'Flexible Fiberoptic Endoscopic Evaluation of swallowing and laryngeal sensory testing by cine or video recording', 45, 'Speech Evaluation', 200.00, false),

-- ============================================
-- COGNITIVE AND DEVELOPMENTAL TESTING
-- ============================================

('96105', 'Assessment of Aphasia', 60, 'Cognitive Assessment', 140.00, true),
('96110', 'Developmental testing, limited', 30, 'Developmental Testing', 85.00, false),
('96112', 'Developmental Test Administration; First Hour', 60, 'Developmental Testing', 150.00, false),
('96113', 'Developmental Test Administration; Each Additional 30 Minutes', 30, 'Developmental Testing', 75.00, true),
('96125', 'Standardized Cognitive Performance Testing', 60, 'Cognitive Assessment', 135.00, true),
('G0451', 'Developmental testing', 30, 'Developmental Testing', 90.00, false),

-- ============================================
-- COGNITIVE FUNCTION INTERVENTIONS
-- ============================================

('97129', 'Cognitive Function–Initial 15 Minutes', 15, 'Cognitive Therapy', 48.00, true),
('97130', 'Cognitive Function–Each Additional 15 Minutes', 15, 'Cognitive Therapy', 48.00, true),

-- ============================================
-- SPECIALIZED THERAPY SERVICES
-- ============================================

('90912', 'Biofeedback Pelvic Health: Initial 15 Minutes', 15, 'Biofeedback', 65.00, false),
('95992', 'Canalith Re-positioning', 15, 'Vestibular Therapy', 55.00, false),
('97533', 'Sensory Integration', 15, 'Occupational Therapy', 48.00, true),
('97537', 'Community/Work Reintegration', 15, 'Occupational Therapy', 50.00, true),
('97542', 'Wheelchair Management— Assessment and Training', 15, 'Occupational Therapy', 52.00, true),
('97545', 'Work Hardening, First 2 Hours', 120, 'Occupational Therapy', 180.00, true),

-- ============================================
-- WOUND CARE
-- ============================================

('97597', 'Wound Care Selective First 20 sq centimeters', 15, 'Wound Care', 75.00, false),
('97598', 'Wound Care Selective; Each additional 20 sq centimeters', 15, 'Wound Care', 40.00, false),
('97602', 'Wound Care Non-Selective', 15, 'Wound Care', 50.00, false),
('97610', 'Low Frequency, Non-Contact, Non-Thermal Ultrasound', 15, 'Wound Care', 60.00, false),

-- ============================================
-- ORTHOTICS AND PROSTHETICS
-- ============================================

('97750', 'Physical Performance Test', 30, 'Assessment', 85.00, true),
('97755', 'Assistive Technology Assessment', 60, 'Assessment', 120.00, true),
('97760', 'Orthotic Management & Training, Initial Orthotic(s) Encounter', 30, 'Orthotics', 95.00, true),
('97761', 'Prosthetic Management and Training, Initial Prosthetic(s) Encounter', 30, 'Prosthetics', 95.00, true),
('97763', 'Orthotic/Prosthetic Management and/or Training, Subsequent Orthotic/Prosthetic Encounter(s)', 30, 'Orthotics', 75.00, true),

-- ============================================
-- COMPRESSION SYSTEMS
-- ============================================

('29581', 'Multi-Layer Compression System - Below Knee', 30, 'Compression Therapy', 65.00, false),
('29584', 'Multi-Layer Compression System - Entire Arm', 30, 'Compression Therapy', 65.00, false),

-- ============================================
-- MODALITIES (if not already added)
-- ============================================

('97012', 'Mechanical Traction', 15, 'Modalities', 32.00, false),
('97016', 'Vasopneumatic device', 15, 'Modalities', 28.00, false),
('97018', 'Paraffin Bath', 15, 'Modalities', 22.00, false),
('97022', 'Whirlpool', 15, 'Modalities', 30.00, false),
('97024', 'Diathermy', 15, 'Modalities', 28.00, false),
('97026', 'Infrared', 15, 'Modalities', 24.00, false),
('97028', 'Ultraviolet', 15, 'Modalities', 26.00, false),
('97032', 'Electrical Stimulation, Manual', 15, 'Electrical Therapy', 35.00, true),
('97033', 'Iontophoresis', 15, 'Modalities', 40.00, true),
('97034', 'Contrast Bath', 15, 'Modalities', 28.00, true),
('97035', 'Ultrasound', 15, 'Modalities', 30.00, true),
('97036', 'Hubbard Tank', 15, 'Modalities', 45.00, true),
('97039', 'Unlisted Modality', 15, 'Modalities', 30.00, true),
('G0281', 'Electrical Stimulation - Stage 3-4 Wounds', 15, 'Electrical Therapy', 35.00, false),
('G0283', 'Electrical Stimulation - Other Than Wound Care', 15, 'Electrical Therapy', 25.00, false),

-- ============================================
-- THERAPEUTIC PROCEDURES (if not already added)
-- ============================================

('97110', 'Therapeutic Exercises', 15, 'Therapeutic Procedures', 45.00, true),
('97112', 'Neuromuscular Re-Education', 15, 'Neuromuscular', 46.00, true),
('97113', 'Aquatic Therapy/Exercises', 15, 'Therapeutic Procedures', 50.00, true),
('97116', 'Gait Training', 15, 'Gait Training', 45.00, true),
('97124', 'Massage', 15, 'Manual Therapy', 42.00, true),
('97139', 'Physical Medicine Procedure', 15, 'Therapeutic Procedures', 45.00, true),
('97140', 'Manual Therapy', 15, 'Manual Therapy', 48.00, true),
('97150', 'Group Therapeutic Procedures', NULL, 'Group Therapy', 25.00, false),
('97530', 'Therapeutic Activities', 15, 'Therapeutic Activities', 47.00, true),
('97535', 'Self Care/Home Management Training', 15, 'ADL Training', 48.00, true),

-- ============================================
-- REMOTE THERAPEUTIC MONITORING
-- ============================================

('98975', 'Remote Therapeutic Monitoring - Initial Set-Up and Patient Education', 20, 'Remote Monitoring', 55.00, false),
('98976', 'Remote Therapeutic Monitoring - Respiratory System', 20, 'Remote Monitoring', 50.00, false),
('98977', 'Remote Therapeutic Monitoring - Musculoskeletal System', 20, 'Remote Monitoring', 50.00, false),
('98978', 'Remote Therapeutic Monitoring - Cognitive Behavioral Therapy', 20, 'Remote Monitoring', 55.00, false),
('98980', 'Remote Therapeutic Monitoring Treatment Management Services - Initial 20 Minutes', 20, 'Remote Monitoring', 60.00, true),
('98981', 'Remote Therapeutic Monitoring Treatment Management Services - Each Additional 20 Minutes', 20, 'Remote Monitoring', 45.00, true)

ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    duration_minutes = EXCLUDED.duration_minutes,
    category = EXCLUDED.category,
    base_rate = EXCLUDED.base_rate,
    is_timed = EXCLUDED.is_timed;

-- ============================================
-- CCI EDITS TABLE (Correct Coding Initiative)
-- Stores which codes cannot be billed together
-- ============================================

CREATE TABLE IF NOT EXISTS cpt_cci_edits (
    cci_edit_id SERIAL PRIMARY KEY,
    column1_code VARCHAR(10) NOT NULL,
    column2_code VARCHAR(10) NOT NULL,
    modifier_59_allowed BOOLEAN DEFAULT false,
    effective_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column1_code) REFERENCES cpt_codes(code),
    FOREIGN KEY (column2_code) REFERENCES cpt_codes(code),
    UNIQUE(column1_code, column2_code)
);

-- Add some key CCI edits examples
-- Format: (primary_code, bundled_code, can_use_modifier_59, notes)

INSERT INTO cpt_cci_edits (column1_code, column2_code, modifier_59_allowed, notes) VALUES
-- Speech therapy combinations
('92507', '97110', true, 'Speech treatment with therapeutic exercise - modifier 59 allowed if different session'),
('92507', '97112', true, 'Speech treatment with neuromuscular re-education'),
('92508', '92507', true, 'Group and individual speech on same day'),
('92526', '97110', true, 'Swallowing dysfunction with exercises'),

-- Cognitive function combinations
('97129', '97153', false, 'Cannot bill cognitive function with ABA therapy same session'),
('97130', '97155', false, 'Additional cognitive with ABA therapy'),

-- Manual therapy combinations
('97140', '97124', false, 'Manual therapy includes massage - cannot bill separately'),
('97140', '97012', true, 'Manual therapy with traction - modifier 59 if different area'),

-- Modalities combinations
('97032', '97014', true, 'Manual electrical stim with unattended - modifier 59 allowed'),
('97035', '97610', true, 'Standard ultrasound with low-frequency ultrasound'),

-- Group therapy restrictions
('97150', '97110', true, 'Group therapy with individual exercise'),
('97150', '97530', true, 'Group therapy with therapeutic activities'),

-- Remote monitoring
('98975', '98976', false, 'Initial setup cannot bill with monitoring same day'),
('98980', '97750', false, 'Remote monitoring with performance test')

ON CONFLICT (column1_code, column2_code) DO NOTHING;

-- ============================================
-- ADD SAMPLE PATIENTS FOR SPEECH/MENTAL HEALTH
-- ============================================

-- Patient 6: Emma Rodriguez - Speech Therapy (Aphasia post-stroke)
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Emma', 'Rodriguez', '1958-06-18', 'Female', 'emma.rodriguez@email.com', '555-0601',
    '987 Elm Street', 'Portland', 'OR', '97203',
    'Medicare', 'MCARE-8472639A', 'N/A',
    'Carlos Rodriguez (Son)', '555-0602',
    'CVA (stroke) 4 months ago with resulting Broca aphasia, Hypertension, Type 2 Diabetes',
    'None known',
    'Aspirin 81mg daily, Lisinopril 20mg daily, Metformin 1000mg twice daily',
    'Active', NOW() - INTERVAL '4 months'
);

-- Patient 7: Daniel Park - Developmental Delays (Pediatric)
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Daniel', 'Park', '2019-03-25', 'Male', 'susan.park@email.com', '555-0701',
    '456 Willow Road', 'Beaverton', 'OR', '97006',
    'Blue Cross Blue Shield', 'BCBS-2847365', 'GRP-88372',
    'Susan Park (Mother)', '555-0701',
    'Speech delay, Autism Spectrum Disorder (Level 1), Sensory processing challenges',
    'Tree nuts',
    'None',
    'Active', NOW() - INTERVAL '1 year'
);

-- Add appointments for Emma Rodriguez (Speech Therapy)
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '2 days',
    '10:00:00',
    60,
    'Completed',
    'Speech and language evaluation. Expressive aphasia noted. Patient has difficulty with word-finding and sentence formation. Good comprehension. Recommended 3x/week therapy.',
    'Dr. Amanda Wilson, MS, CCC-SLP'
FROM patients p WHERE p.first_name = 'Emma' AND p.last_name = 'Rodriguez';

-- Add appointments for Daniel Park (Developmental Testing)
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '1 day',
    '14:00:00',
    90,
    'Completed',
    'Comprehensive developmental testing. Speech delay confirmed - approximately 12-month delay. Sensory integration challenges noted. Starting speech and OT services.',
    'Dr. Robert Chen, PhD, CCC-SLP'
FROM patients p WHERE p.first_name = 'Daniel' AND p.last_name = 'Park';

-- Billing for Emma Rodriguez - Speech Evaluation
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '92523',
    1,
    125.00,
    100.00,
    25.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Emma' AND p.last_name = 'Rodriguez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '2 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '96105',
    1,
    140.00,
    112.00,
    28.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Emma' AND p.last_name = 'Rodriguez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '2 days';

-- Billing for Daniel Park - Developmental Testing
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '96112',
    1,
    150.00,
    120.00,
    30.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Daniel' AND p.last_name = 'Park'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '96113',
    1,
    75.00,
    60.00,
    15.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Daniel' AND p.last_name = 'Park'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all speech and mental health CPT codes
SELECT 
    code,
    description,
    category,
    base_rate,
    is_timed
FROM cpt_codes
WHERE category IN ('Speech Therapy', 'Speech Evaluation', 'Cognitive Assessment', 
                   'Cognitive Therapy', 'Developmental Testing', 'Remote Monitoring')
ORDER BY category, code;

-- Show CCI edits (bundling rules)
SELECT 
    column1_code,
    column2_code,
    modifier_59_allowed,
    notes
FROM cpt_cci_edits
ORDER BY column1_code;

-- Summary of all patients
SELECT 
    first_name || ' ' || last_name AS patient_name,
    date_of_birth,
    insurance_provider,
    medical_history
FROM patients
ORDER BY last_name;
