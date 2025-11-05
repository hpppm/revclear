-- PART 1: PHYSICAL THERAPY
-- Physical Therapy CPT Codes and 5 Sample Patients
-- RevClear Healthcare Management System

-- ============================================
-- PHYSICAL THERAPY CPT CODES
-- ============================================

-- Insert Physical Therapy CPT Codes
INSERT INTO cpt_codes (code, description, duration_minutes, category, base_rate) VALUES
('97110', 'Therapeutic exercises to develop strength and endurance, range of motion, and flexibility', 15, 'Therapeutic Procedures', 45.00),
('97140', 'Manual therapy techniques (e.g., connective tissue massage, joint mobilization and manipulation, and manual traction)', 15, 'Manual Therapy', 48.00),
('97112', 'Neuromuscular Re-education: Therapeutic procedure, 1 or more areas, neuromuscular reeducation of movement, balance, coordination, kinesthetic sense, posture, and/or proprioception', 15, 'Neuromuscular', 46.00),
('97530', 'Therapeutic Activities/Kinetic', 15, 'Therapeutic Activities', 47.00),
('97010', 'Hot or cold packs therapy', 15, 'Modalities', 20.00),
('97014', 'Electrical stimulation (unattended)', 15, 'Electrical Therapy', 25.00),
('G0283', 'Electrical stimulation (unattended), to one or more areas for indication(s) other than wound care, as part of a therapy plan of care', 15, 'Electrical Therapy', 25.00),
('97161', 'Physical therapy evaluation (Low complexity)', 30, 'Evaluation', 95.00),
('97035', 'Ultrasound', 15, 'Modalities', 30.00),
('97116', 'Therapeutic procedure, gait training (includes stair climbing)', 15, 'Gait Training', 45.00),
('97162', 'Physical Therapy Evaluation (Moderate complexity)', 45, 'Evaluation', 125.00),
('97535', 'Self-care/home management training (e.g., activities of daily living [ADL] and compensatory training, meal preparation, safety procedures)', 15, 'ADL Training', 48.00),
('97507', 'Treatment of speech, language, voice, communication, and/or auditory processing disorder; individual', 15, 'Speech Therapy', 50.00),
('97016', 'Vasopneumatic devices', 15, 'Modalities', 28.00),
('97164', 'Re-evaluation of physical therapy established plan of care', 30, 'Re-evaluation', 85.00),
('97032', 'Electrical stimulation (manual), each 15 minutes', 15, 'Electrical Therapy', 35.00),
('97012', 'Application of modality to one or more areas; traction, mechanical', 15, 'Modalities', 32.00),
('97150', 'Therapeutic procedure(s), group (2 or more individuals), untimed', NULL, 'Group Therapy', 25.00)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    duration_minutes = EXCLUDED.duration_minutes,
    category = EXCLUDED.category,
    base_rate = EXCLUDED.base_rate;

-- ============================================
-- PHYSICAL THERAPY PATIENTS (5 PATIENTS)
-- ============================================

-- PT Patient 1: Edward Martinez
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Edward', 'Martinez', '1965-03-15', 'Male', 'edward.martinez@email.com', '555-0101',
    '123 Oak Street', 'Portland', 'OR', '97201',
    'Blue Cross Blue Shield', 'BCBS-8472639', 'GRP-45821',
    'Maria Martinez (Spouse)', '555-0102',
    'Chronic lower back pain, Previous L4-L5 herniated disc surgery (2020), Hypertension',
    'Penicillin',
    'Lisinopril 10mg daily, Ibuprofen 400mg as needed',
    'Active', NOW() - INTERVAL '6 months'
);

-- PT Patient 2: Mary Johnson
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Mary', 'Johnson', '1978-07-22', 'Female', 'mary.johnson@email.com', '555-0201',
    '456 Maple Avenue', 'Portland', 'OR', '97202',
    'United Healthcare', 'UHC-9283746', 'GRP-72934',
    'Robert Johnson (Husband)', '555-0202',
    'Post-operative right knee replacement (3 months ago), Type 2 Diabetes, Osteoarthritis',
    'Sulfa drugs',
    'Metformin 500mg twice daily, Acetaminophen 500mg as needed',
    'Active', NOW() - INTERVAL '3 months'
);

-- PT Patient 3: Jacob Williams
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Jacob', 'Williams', '1992-11-08', 'Male', 'jacob.williams@email.com', '555-0301',
    '789 Pine Street', 'Beaverton', 'OR', '97005',
    'Aetna', 'AETNA-5629384', 'GRP-88291',
    'Sarah Williams (Sister)', '555-0302',
    'Sports injury - ACL tear and reconstruction (6 weeks post-op), Previous right shoulder dislocation (2019)',
    'None known',
    'Naproxen 250mg twice daily, Multivitamin',
    'Active', NOW() - INTERVAL '6 weeks'
);

-- PT Patient 4: Sarah Chen
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Sarah', 'Chen', '1985-04-30', 'Female', 'sarah.chen@email.com', '555-0401',
    '321 Birch Lane', 'Lake Oswego', 'OR', '97034',
    'Cigna', 'CIGNA-7482936', 'GRP-39482',
    'David Chen (Husband)', '555-0402',
    'Frozen shoulder (adhesive capsulitis) right side, Carpal tunnel syndrome bilateral (mild), Migraine headaches',
    'Latex, Codeine',
    'Sumatriptan 50mg as needed, Vitamin D 2000IU daily',
    'Active', NOW() - INTERVAL '2 months'
);

-- PT Patient 5: Michael Davis
INSERT INTO patients (
    first_name, last_name, date_of_birth, gender, email, phone,
    address_line1, city, state, zip_code,
    insurance_provider, insurance_policy_number, insurance_group_number,
    emergency_contact_name, emergency_contact_phone,
    medical_history, allergies, current_medications,
    status, created_at
) VALUES (
    'Michael', 'Davis', '1970-09-12', 'Male', 'michael.davis@email.com', '555-0501',
    '654 Cedar Drive', 'Hillsboro', 'OR', '97123',
    'Kaiser Permanente', 'KAISER-3948572', 'GRP-11029',
    'Linda Davis (Wife)', '555-0502',
    'Cervical radiculopathy (C5-C6), Chronic neck pain due to whiplash injury (2022), History of rotator cuff tendinitis',
    'Aspirin',
    'Gabapentin 300mg three times daily, Cyclobenzaprine 10mg at bedtime',
    'Active', NOW() - INTERVAL '4 months'
);

-- ============================================
-- PHYSICAL THERAPY APPOINTMENTS
-- ============================================

-- Edward Martinez - Lower back pain therapy sessions
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '5 days',
    '09:00:00',
    60,
    'Completed',
    'Initial evaluation. Patient reports 6/10 pain in lower lumbar region. Limited ROM in flexion and extension. Recommended 2x/week therapy.',
    'Dr. Jennifer Thompson, PT, DPT'
FROM patients p WHERE p.first_name = 'Edward' AND p.last_name = 'Martinez';

INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '3 days',
    '09:00:00',
    45,
    'Completed',
    'Session 2. Therapeutic exercises and manual therapy. Pain reduced to 4/10. Good patient compliance.',
    'Dr. Jennifer Thompson, PT, DPT'
FROM patients p WHERE p.first_name = 'Edward' AND p.last_name = 'Martinez';

-- Mary Johnson - Post-knee replacement therapy
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '4 days',
    '10:00:00',
    60,
    'Completed',
    'Post-op evaluation. ROM 0-95 degrees. Moderate edema. Started gait training and strengthening exercises.',
    'Dr. Michael Rodriguez, PT, DPT'
FROM patients p WHERE p.first_name = 'Mary' AND p.last_name = 'Johnson';

-- Jacob Williams - ACL reconstruction rehab
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '2 days',
    '14:00:00',
    60,
    'Completed',
    'Week 6 post-op ACL reconstruction. ROM improving. Started controlled weight-bearing exercises. No signs of infection.',
    'Dr. Lisa Anderson, PT, DPT'
FROM patients p WHERE p.first_name = 'Jacob' AND p.last_name = 'Williams';

-- Sarah Chen - Frozen shoulder treatment
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE - INTERVAL '1 day',
    '11:00:00',
    45,
    'Completed',
    'Moderate complexity evaluation. Severe ROM limitation. Initiated manual therapy and modalities. Patient education on home exercises.',
    'Dr. Jennifer Thompson, PT, DPT'
FROM patients p WHERE p.first_name = 'Sarah' AND p.last_name = 'Chen';

-- Michael Davis - Cervical radiculopathy treatment
INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration_minutes, status, notes, therapist_name)
SELECT 
    p.patient_id,
    CURRENT_DATE,
    '13:00:00',
    60,
    'Scheduled',
    'Re-evaluation scheduled. Patient reports improvement in radiating symptoms.',
    'Dr. Michael Rodriguez, PT, DPT'
FROM patients p WHERE p.first_name = 'Michael' AND p.last_name = 'Davis';

-- ============================================
-- PHYSICAL THERAPY BILLING RECORDS
-- ============================================

-- Edward Martinez - Session 1 (Initial Evaluation + Therapeutic Exercise)
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97161',
    1,
    95.00,
    76.00,
    19.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Edward' AND p.last_name = 'Martinez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '5 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97110',
    2,
    90.00,
    72.00,
    18.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Edward' AND p.last_name = 'Martinez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '5 days';

-- Edward Martinez - Session 2
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97140',
    2,
    96.00,
    76.80,
    19.20,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Edward' AND p.last_name = 'Martinez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '3 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97010',
    1,
    20.00,
    16.00,
    4.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Edward' AND p.last_name = 'Martinez'
AND a.appointment_date = CURRENT_DATE - INTERVAL '3 days';

-- Mary Johnson - Post-op knee therapy
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97162',
    1,
    125.00,
    100.00,
    25.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Mary' AND p.last_name = 'Johnson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '4 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97116',
    2,
    90.00,
    72.00,
    18.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Mary' AND p.last_name = 'Johnson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '4 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97110',
    1,
    45.00,
    36.00,
    9.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Mary' AND p.last_name = 'Johnson'
AND a.appointment_date = CURRENT_DATE - INTERVAL '4 days';

-- Jacob Williams - ACL rehab
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97110',
    3,
    135.00,
    108.00,
    27.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Jacob' AND p.last_name = 'Williams'
AND a.appointment_date = CURRENT_DATE - INTERVAL '2 days';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97112',
    2,
    92.00,
    73.60,
    18.40,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Jacob' AND p.last_name = 'Williams'
AND a.appointment_date = CURRENT_DATE - INTERVAL '2 days';

-- Sarah Chen - Frozen shoulder
INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97162',
    1,
    125.00,
    100.00,
    25.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Sarah' AND p.last_name = 'Chen'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97140',
    2,
    96.00,
    76.80,
    19.20,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Sarah' AND p.last_name = 'Chen'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

INSERT INTO billing_records (patient_id, appointment_id, cpt_code, units, charge_amount, insurance_coverage, patient_responsibility, status, billing_date)
SELECT 
    p.patient_id,
    a.appointment_id,
    '97035',
    1,
    30.00,
    24.00,
    6.00,
    'Submitted',
    a.appointment_date
FROM patients p
JOIN appointments a ON p.patient_id = a.patient_id
WHERE p.first_name = 'Sarah' AND p.last_name = 'Chen'
AND a.appointment_date = CURRENT_DATE - INTERVAL '1 day';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify patients
SELECT 
    patient_id,
    first_name,
    last_name,
    date_of_birth,
    insurance_provider,
    status
FROM patients
WHERE last_name IN ('Martinez', 'Johnson', 'Williams', 'Chen', 'Davis')
ORDER BY last_name, first_name;

-- Verify CPT codes
SELECT 
    code,
    description,
    category,
    base_rate
FROM cpt_codes
WHERE category LIKE '%Therapy%' OR category LIKE '%Evaluation%' OR category = 'Modalities'
ORDER BY code;

-- Patient billing summary
SELECT 
    p.first_name || ' ' || p.last_name AS patient_name,
    COUNT(DISTINCT a.appointment_id) AS total_appointments,
    COUNT(b.billing_id) AS total_billing_records,
    SUM(b.charge_amount) AS total_charges,
    SUM(b.insurance_coverage) AS total_insurance_paid,
    SUM(b.patient_responsibility) AS total_patient_owes
FROM patients p
LEFT JOIN appointments a ON p.patient_id = a.patient_id
LEFT JOIN billing_records b ON a.appointment_id = b.appointment_id
WHERE p.last_name IN ('Martinez', 'Johnson', 'Williams', 'Chen', 'Davis')
GROUP BY p.patient_id, p.first_name, p.last_name
ORDER BY p.last_name;
