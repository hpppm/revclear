-- PART 2: SPEECH-LANGUAGE PATHOLOGY
-- Speech Therapy CPT Codes and 5 Sample Patients
-- RevClear Healthcare Management System

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
('92616', 'Flexible Fiberoptic Endoscopic Evaluation of swallowing and laryngeal sensory testing by cine or video recording', 45, 'Speech Evaluation', 200.00, false)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    duration_minutes = EXCLUDED.duration_minutes,
    category = EXCLUDED.category,
    base_rate = EXCLUDED.base_rate,
    is_timed = EXCLUDED.is_timed;

-- ============================================
-- SPEECH THERAPY PATIENTS (5 PATIENTS)
-- ============================================

-- SLP Patient 1: Emma Rodriguez - Post-stroke Aphasia
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

-- SLP Patient 2: Daniel Park - Pediatric Speech Delay
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

-- SLP Patient 3: Robert Thompson - Voice Disorder
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Robert', 'Thompson', '1972-11-30', 'Male', 'robert.thompson@email.com', '555-0801',
    '234 Ash Boulevard', 'Hillsboro', 'OR', '97124',
    'Aetna', 'AETNA-9284756', 'GRP-44821',
    'Linda Thompson (Wife)', '555-0802',
    'Vocal cord nodules (professional singer), GERD, Chronic laryngitis',
    'Sulfa drugs',
    'Omeprazole 20mg daily',
    'Active', NOW() - INTERVAL '3 months'
);

-- SLP Patient 4: Olivia Bennett - Stuttering
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Olivia', 'Bennett', '2015-08-14', 'Female', 'jessica.bennett@email.com', '555-0901',
    '789 Cedar Avenue', 'Lake Oswego', 'OR', '97035',
    'United Healthcare', 'UHC-3948572', 'GRP-29384',
    'Jessica Bennett (Mother)', '555-0901',
    'Developmental stuttering (began age 4), Anxiety related to speech difficulties',
    'None known',
    'None',
    'Active', NOW() - INTERVAL '18 months'
);

-- SLP Patient 5: Harold Martinez - Dysphagia
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Harold', 'Martinez', '1945-02-20', 'Male', 'harold.martinez@email.com', '555-1001',
    '567 Spruce Street', 'Portland', 'OR', '97204',
    'Medicare', 'MCARE-5738291B', 'N/A',
    'Maria Martinez (Daughter)', '555-1002',
    'Dysphagia following esophageal surgery, History of aspiration pneumonia, Parkinsons disease',
    'Penicillin',
    'Carbidopa-Levodopa 25-100mg three times daily, Thickened liquids',
    'Active', NOW() - INTERVAL '5 months'
);

-- ============================================
-- SPEECH THERAPY APPOINTMENTS
-- ============================================

-- Emma Rodriguez - Aphasia therapy
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

-- Daniel Park - Pediatric speech therapy
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '1 day',
    '14:00:00',
    45,
    'Completed',
    'Individual speech therapy session. Working on articulation of /r/ and /s/ sounds. Using play-based therapy. Good engagement, making progress.',
    'Dr. Sarah Kim, MA, CCC-SLP'
FROM patients p WHERE p.first_name = 'Daniel' AND p.last_name = 'Park';

-- Robert Thompson - Voice therapy
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '3 days',
    '11:00:00',
    45,
    'Completed',
    'Voice evaluation and treatment. Vocal nodules improving with therapy. Working on proper vocal technique and breath support. Patient compliance excellent.',
    'Dr. Amanda Wilson, MS, CCC-SLP'
FROM patients p WHERE p.first_name = 'Robert' AND p.last_name = 'Thompson';

-- Olivia Bennett - Fluency therapy
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE,
    '15:00:00',
    45,
    'Scheduled',
    'Fluency therapy session scheduled. Continue working on easy onset and light articulatory contacts.',
    'Dr. Robert Chen, PhD, CCC-SLP'
FROM patients p WHERE p.first_name = 'Olivia' AND p.last_name = 'Bennett';

-- Harold Martinez - Swallowing therapy
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '4 days',
    '09:00:00',
    60,
    'Completed',
    'Modified barium swallow study completed. Aspiration risk noted with thin liquids. Diet modified to nectar-thick liquids. Swallowing exercises initiated.',
    'Dr. Amanda Wilson, MS, CCC-SLP'
FROM patients p WHERE p.first_name = 'Harold' AND p.last_name = 'Martinez';

-- ============================================
-- SPEECH THERAPY BILLING RECORDS
-- ============================================

-- Emma Rodriguez - Speech evaluation and aphasia assessment
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

-- Daniel Park - Individual speech therapy
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '92507',
    2,
    100.00,
    80.00,
    20.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Daniel' AND p.last_name = 'Park'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

-- Robert Thompson - Voice evaluation
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '92524',
    1,
    90.00,
    72.00,
    18.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Robert' AND p.last_name = 'Thompson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '3 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '92507',
    1,
    50.00,
    40.00,
    10.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Robert' AND p.last_name = 'Thompson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '3 days';

-- Harold Martinez - Modified barium swallow
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '92611',
    1,
    150.00,
    120.00,
    30.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Harold' AND p.last_name = 'Martinez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '4 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '92526',
    1,
    55.00,
    44.00,
    11.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Harold' AND p.last_name = 'Martinez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '4 days';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show speech therapy CPT codes
SELECT 
    code,
    description,
    category,
    base_rate
FROM cpt_codes
WHERE category LIKE 'Speech%'
ORDER BY code;

-- Show speech therapy patients
SELECT 
    first_name || ' ' || last_name AS patient_name,
    date_of_birth,
    insurance_provider,
    medical_history
FROM patients
WHERE last_name IN ('Rodriguez', 'Park', 'Thompson', 'Bennett', 'Martinez')
AND first_name IN ('Emma', 'Daniel', 'Robert', 'Olivia', 'Harold')
ORDER BY last_name;
