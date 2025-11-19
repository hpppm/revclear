-- =========================================================
-- 🏥 AI-Powered Medical Billing System
-- PostgreSQL 14+ (Cloud SQL) | HIPAA-Compliant Schema
-- =========================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 🔐 USERS TABLE
-- =========================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'clinician',
  created_at TIMESTAMP DEFAULT now()
);

-- =========================================================
-- 👥 PATIENTS TABLE
-- =========================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_patients_clinician ON patients(clinician_id);

-- =========================================================
-- 🩺 ENCOUNTERS TABLE
-- =========================================================
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  clinician_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date_of_service TIMESTAMP NOT NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status TEXT DEFAULT 'draft',
  ai_confidence NUMERIC,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_timestamp
BEFORE UPDATE ON encounters
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE INDEX idx_encounters_clinician ON encounters(clinician_id);
CREATE INDEX idx_encounters_patient ON encounters(patient_id);

-- =========================================================
-- 🎙️ AUDIO RECORDS TABLE
-- =========================================================
CREATE TABLE audio_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  duration_seconds NUMERIC,
  transcription_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audio_encounter ON audio_records(encounter_id);

-- =========================================================
-- 🤖 AI RESULTS TABLE
-- =========================================================
CREATE TABLE ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  flow_name TEXT NOT NULL,
  input_json JSONB,
  output_json JSONB,
  model_version TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_ai_results_encounter ON ai_results(encounter_id);
CREATE INDEX idx_ai_results_flow ON ai_results(flow_name);

-- =========================================================
-- 💼 CLAIMS TABLE
-- =========================================================
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  clinician_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id),
  diagnosis_codes TEXT[],
  procedure_codes TEXT[],
  total_amount NUMERIC(10,2),
  insurance_provider TEXT,
  status TEXT DEFAULT 'ready',
  rejection_reason TEXT,
  submission_date TIMESTAMP,
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_claims_update_timestamp
BEFORE UPDATE ON claims
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE INDEX idx_claims_encounter ON claims(encounter_id);
CREATE INDEX idx_claims_clinician ON claims(clinician_id);
CREATE INDEX idx_claims_patient ON claims(patient_id);
CREATE INDEX idx_claims_status ON claims(status);

-- =========================================================
-- 🧠 AI FEEDBACK TABLE
-- =========================================================
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
  ai_codes JSONB,
  final_codes JSONB,
  status TEXT,
  rejection_reason TEXT,
  model_version TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_feedback_claim ON ai_feedback(claim_id);
CREATE INDEX idx_feedback_encounter ON ai_feedback(encounter_id);

-- =========================================================
-- 🔔 NOTIFICATIONS TABLE
-- =========================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- =========================================================
-- 🧾 AUDIT LOG TABLE
-- =========================================================
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT,
  table_name TEXT,
  record_id UUID,
  timestamp TIMESTAMP DEFAULT now()
);

-- Generic audit event trigger function
CREATE OR REPLACE FUNCTION audit_event() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, record_id)
  VALUES (
    current_setting('app.current_user_id', true)::uuid,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach audit triggers to critical tables
CREATE TRIGGER trg_audit_patients
AFTER INSERT OR UPDATE OR DELETE ON patients
FOR EACH ROW EXECUTE FUNCTION audit_event();

CREATE TRIGGER trg_audit_encounters
AFTER INSERT OR UPDATE OR DELETE ON encounters
FOR EACH ROW EXECUTE FUNCTION audit_event();

CREATE TRIGGER trg_audit_claims
AFTER INSERT OR UPDATE OR DELETE ON claims
FOR EACH ROW EXECUTE FUNCTION audit_event();

-- =========================================================
-- 🧩 VIEW EXAMPLES (Optional RLS Simulation)
-- =========================================================
CREATE VIEW clinician_patients AS
SELECT * FROM patients
WHERE clinician_id = current_setting('app.current_user_id', true)::uuid;

CREATE VIEW clinician_encounters AS
SELECT * FROM encounters
WHERE clinician_id = current_setting('app.current_user_id', true)::uuid;

-- =========================================================
-- ⚙️ DEFAULT POLICIES / INDEX OPTIMIZATION
-- =========================================================
ANALYZE;
VACUUM;
