-- PART 3: MENTAL HEALTH & BEHAVIORAL HEALTH
-- Mental Health CPT Codes and 5 Sample Patients
-- RevClear Healthcare Management System

-- ============================================
-- MENTAL HEALTH & COGNITIVE CPT CODES
-- ============================================

INSERT INTO cpt_codes (code, description, duration_minutes, category, base_rate, is_timed) VALUES
-- Cognitive and Developmental Testing
('96105', 'Assessment of Aphasia', 60, 'Cognitive Assessment', 140.00, true),
('96110', 'Developmental testing, limited', 30, 'Developmental Testing', 85.00, false),
('96112', 'Developmental Test Administration; First Hour', 60, 'Developmental Testing', 150.00, false),
('96113', 'Developmental Test Administration; Each Additional 30 Minutes', 30, 'Developmental Testing', 75.00, true),
('96125', 'Standardized Cognitive Performance Testing', 60, 'Cognitive Assessment', 135.00, true),
('G0451', 'Developmental testing', 30, 'Developmental Testing', 90.00, false),

-- Cognitive Function Interventions
('97129', 'Cognitive Function–Initial 15 Minutes', 15, 'Cognitive Therapy', 48.00, true),
('97130', 'Cognitive Function–Each Additional 15 Minutes', 15, 'Cognitive Therapy', 48.00, true),

-- Specialized Therapy Services
('90912', 'Biofeedback Pelvic Health: Initial 15 Minutes', 15, 'Biofeedback', 65.00, false),
('95992', 'Canalith Re-positioning', 15, 'Vestibular Therapy', 55.00, false),
('97533', 'Sensory Integration', 15, 'Occupational Therapy', 48.00, true),
('97537', 'Community/Work Reintegration', 15, 'Occupational Therapy', 50.00, true),
('97542', 'Wheelchair Management— Assessment and Training', 15, 'Occupational Therapy', 52.00, true),
('97545', 'Work Hardening, First 2 Hours', 120, 'Occupational Therapy', 180.00, true),

-- Wound Care
('97597', 'Wound Care Selective First 20 sq centimeters', 15, 'Wound Care', 75.00, false),
('97598', 'Wound Care Selective; Each additional 20 sq centimeters', 15, 'Wound Care', 40.00, false),
('97602', 'Wound Care Non-Selective', 15, 'Wound Care', 50.00, false),
('97610', 'Low Frequency, Non-Contact, Non-Thermal Ultrasound', 15, 'Wound Care', 60.00, false),

-- Orthotics and Prosthetics
('97750', 'Physical Performance Test', 30, 'Assessment', 85.00, true),
('97755', 'Assistive Technology Assessment', 60, 'Assessment', 120.00, true),
('97760', 'Orthotic Management & Training, Initial Orthotic(s) Encounter', 30, 'Orthotics', 95.00, true),
('97761', 'Prosthetic Management and Training, Initial Prosthetic(s) Encounter', 30, 'Prosthetics', 95.00, true),
('97763', 'Orthotic/Prosthetic Management and/or Training, Subsequent Orthotic/Prosthetic Encounter(s)', 30, 'Orthotics', 75.00, true),

-- Compression Systems
('29581', 'Multi-Layer Compression System - Below Knee', 30, 'Compression Therapy', 65.00, false),
('29584', 'Multi-Layer Compression System - Entire Arm', 30, 'Compression Therapy', 65.00, false),

-- Additional Modalities
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

-- Therapeutic Procedures
('97113', 'Aquatic Therapy/Exercises', 15, 'Therapeutic Procedures', 50.00, true),
('97124', 'Massage', 15, 'Manual Therapy', 42.00, true),
('97139', 'Physical Medicine Procedure', 15, 'Therapeutic Procedures', 45.00, true),

-- Remote Therapeutic Monitoring
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

-- Add key CCI edits
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
-- MENTAL HEALTH PATIENTS (5 PATIENTS)
-- ============================================

-- MH Patient 1: Jennifer Lopez - Anxiety and PTSD
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Jennifer', 'Lopez', '1988-05-14', 'Female', 'jennifer.lopez@email.com', '555-1101',
    '890 Willow Lane', 'Portland', 'OR', '97205',
    'Cigna', 'CIGNA-8493827', 'GRP-55291',
    'Mark Lopez (Spouse)', '555-1102',
    'PTSD following motor vehicle accident (2 years ago), Generalized anxiety disorder, Panic attacks',
    'None known',
    'Sertraline 100mg daily, Propranolol 10mg as needed for panic',
    'Active', NOW() - INTERVAL '8 months'
);

-- MH Patient 2: Thomas Anderson - Autism Spectrum Disorder
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Thomas', 'Anderson', '2017-09-08', 'Male', 'karen.anderson@email.com', '555-1201',
    '345 Oak Ridge Drive', 'Beaverton', 'OR', '97007',
    'United Healthcare', 'UHC-5839274', 'GRP-77482',
    'Karen Anderson (Mother)', '555-1201',
    'Autism Spectrum Disorder Level 2, Sensory processing disorder, Developmental delays',
    'Dairy products',
    'Melatonin 2mg at bedtime',
    'Active', NOW() - INTERVAL '2 years'
);

-- MH Patient 3: Patricia White - Cognitive Decline
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Patricia', 'White', '1951-12-03', 'Female', 'patricia.white@email.com', '555-1301',
    '678 Maple Court', 'Lake Oswego', 'OR', '97036',
    'Medicare', 'MCARE-2938475C', 'N/A',
    'Rachel White (Daughter)', '555-1302',
    'Mild Cognitive Impairment, Early-stage dementia suspected, Hypertension, Osteoporosis',
    'Sulfa drugs',
    'Donepezil 5mg daily, Amlodipine 5mg daily, Calcium with Vitamin D',
    'Active', NOW() - INTERVAL '10 months'
);

-- MH Patient 4: Marcus Johnson - TBI Recovery
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Marcus', 'Johnson', '1995-04-22', 'Male', 'marcus.johnson@email.com', '555-1401',
    '123 Pine Valley Road', 'Hillsboro', 'OR', '97125',
    'Aetna', 'AETNA-7294856', 'GRP-33948',
    'Angela Johnson (Mother)', '555-1402',
    'Traumatic Brain Injury (8 months ago from motorcycle accident), Cognitive deficits, Executive function impairment, Short-term memory issues',
    'Penicillin',
    'Levetiracetam 500mg twice daily for seizure prevention',
    'Active', NOW() - INTERVAL '8 months'
);

-- MH Patient 5: Sophia Nguyen - Chronic Pain with Depression
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Sophia', 'Nguyen', '1980-07-28', 'Female', 'sophia.nguyen@email.com', '555-1501',
    '567 Birch Street', 'Portland', 'OR', '97206',
    'Kaiser Permanente', 'KAISER-6283947', 'GRP-88291',
    'David Nguyen (Husband)', '555-1502',
    'Fibromyalgia, Chronic pain syndrome, Major Depressive Disorder, Insomnia',
    'Codeine, Latex',
    'Duloxetine 60mg daily, Pregabalin 75mg twice daily, Trazodone 50mg at bedtime',
    'Active', NOW() - INTERVAL '1 year'
);

-- ============================================
-- MENTAL HEALTH APPOINTMENTS
-- ============================================

-- Jennifer Lopez - Cognitive therapy for PTSD
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '3 days',
    '10:00:00',
    60,
    'Completed',
    'Cognitive therapy session. Working on trauma processing and anxiety management techniques. Patient reports decreased frequency of panic attacks. Continue CBT approach.',
    'Dr. Lisa Chang, PsyD'
FROM patients p WHERE p.first_name = 'Jennifer' AND p.last_name = 'Lopez';

-- Thomas Anderson - Developmental testing and sensory integration
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '5 days',
    '14:00:00',
    90,
    'Completed',
    'Comprehensive developmental assessment and sensory integration therapy. Patient showing progress with sensory regulation. Continue OT 2x/week.',
    'Dr. Emily Rodriguez, OTD, OTR/L'
FROM patients p WHERE p.first_name = 'Thomas' AND p.last_name = 'Anderson';

-- Patricia White - Cognitive assessment
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '7 days',
    '09:00:00',
    120,
    'Completed',
    'Comprehensive cognitive assessment. MMSE score 24/30. Memory and executive function deficits confirmed. Recommend cognitive rehabilitation therapy and family training.',
    'Dr. Michael Chen, PhD, Neuropsychologist'
FROM patients p WHERE p.first_name = 'Patricia' AND p.last_name = 'White';

-- Marcus Johnson - Cognitive rehabilitation
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '1 day',
    '11:00:00',
    60,
    'Completed',
    'Cognitive rehabilitation session. Focus on attention, memory strategies, and executive function tasks. Patient engaged well. Making slow but steady progress.',
    'Dr. Lisa Chang, PsyD'
FROM patients p WHERE p.first_name = 'Marcus' AND p.last_name = 'Johnson';

-- Sophia Nguyen - Biofeedback and cognitive therapy
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE,
    '13:00:00',
    60,
    'Scheduled',
    'Scheduled: Biofeedback session for pain management and cognitive therapy for depression. Continue work on pain coping strategies.',
    'Dr. Emily Rodriguez, OTD, OTR/L'
FROM patients p WHERE p.first_name = 'Sophia' AND p.last_name = 'Nguyen';

-- ============================================
-- MENTAL HEALTH BILLING RECORDS
-- ============================================

-- Jennifer Lopez - Cognitive therapy
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97129',
    4,
    192.00,
    153.60,
    38.40,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Jennifer' AND p.last_name = 'Lopez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '3 days';

-- Thomas Anderson - Developmental testing
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
WHERE p.first_name = 'Thomas' AND p.last_name = 'Anderson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '5 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97533',
    2,
    96.00,
    76.80,
    19.20,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Thomas' AND p.last_name = 'Anderson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '5 days';

-- Patricia White - Cognitive assessment
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '96125',
    2,
    270.00,
    216.00,
    54.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Patricia' AND p.last_name = 'White'
AND a.appointment_date = CURRENT_DATE - INTERVAL '7 days';

-- Marcus Johnson - Cognitive rehabilitation
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97129',
    3,
    144.00,
    115.20,
    28.80,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Marcus' AND p.last_name = 'Johnson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97130',
    1,
    48.00,
    38.40,
    9.60,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Marcus' AND p.last_name = 'Johnson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all mental health CPT codes
SELECT 
    code,
    description,
    category,
    base_rate
FROM cpt_codes
WHERE category IN ('Cognitive Assessment', 'Cognitive Therapy', 'Developmental Testing', 
                   'Biofeedback', 'Occupational Therapy', 'Remote Monitoring')
ORDER BY category, code;

-- Show mental health patients
SELECT 
    first_name || ' ' || last_name AS patient_name,
    date_of_birth,
    insurance_provider,
    medical_history
FROM patients
WHERE last_name IN ('Lopez', 'Anderson', 'White', 'Johnson', 'Nguyen')
AND first_name IN ('Jennifer', 'Thomas', 'Patricia', 'Marcus', 'Sophia')
ORDER BY last_name;

-- Summary of all 15 patients by category
SELECT 
    'Physical Therapy' AS category,
    COUNT(*) AS patient_count
FROM patients
WHERE last_name IN ('Martinez', 'Johnson', 'Williams', 'Chen', 'Davis')
AND first_name IN ('Edward', 'Mary', 'Jacob', 'Sarah', 'Michael')
UNION ALL
SELECT 
    'Speech Therapy' AS category,
    COUNT(*) AS patient_count
FROM patients
WHERE last_name IN ('Rodriguez', 'Park', 'Thompson', 'Bennett', 'Martinez')
AND first_name IN ('Emma', 'Daniel', 'Robert', 'Olivia', 'Harold')
UNION ALL
SELECT 
    'Mental Health' AS category,
    COUNT(*) AS patient_count
FROM patients
WHERE last_name IN ('Lopez', 'Anderson', 'White', 'Johnson', 'Nguyen')
AND first_name IN ('Jennifer', 'Thomas', 'Patricia', 'Marcus', 'Sophia');
