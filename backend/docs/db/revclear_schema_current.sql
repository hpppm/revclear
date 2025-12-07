--
-- PostgreSQL database dump
--

\restrict VV5Bk0LQ1DSY84IhDT1EhOYqZOLTO4R1xOvAu6Hq7eyeu6fXSGRovE9ngCTMgK0

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: audit_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_id uuid,
    encounter_id uuid,
    ai_codes jsonb,
    final_codes jsonb,
    status text,
    rejection_reason text,
    model_version text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ai_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid,
    flow_name text NOT NULL,
    input_json jsonb,
    output_json jsonb,
    model_version text,
    confidence_score numeric,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audio_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid,
    file_url text NOT NULL,
    duration_seconds numeric,
    transcription_status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    user_id uuid,
    action text,
    table_name text,
    record_id uuid,
    "timestamp" timestamp without time zone DEFAULT now()
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid,
    clinician_id uuid,
    patient_id uuid,
    diagnosis_codes text[],
    procedure_codes text[],
    total_amount numeric(10,2),
    insurance_provider text,
    status text DEFAULT 'draft'::text,
    rejection_reason text,
    submission_date timestamp without time zone,
    payment_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    payer_id text,
    payer_name text,
    claim_type text DEFAULT 'professional'::text,
    submission_type text DEFAULT 'initial'::text,
    patient_responsibility numeric(10,2),
    line_items jsonb,
    billing_provider jsonb,
    service_facility jsonb,
    service_date_start date,
    service_date_end date,
    subscriber_relationship text,
    subscriber jsonb,
    rendering_provider jsonb,
    organization_id uuid,
    CONSTRAINT check_claim_type CHECK ((claim_type = ANY (ARRAY['professional'::text, 'institutional'::text]))),
    CONSTRAINT check_claims_status CHECK ((status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'ready'::text, 'submitted'::text, 'denied'::text, 'paid'::text, 'completed'::text]))),
    CONSTRAINT check_submission_type CHECK ((submission_type = ANY (ARRAY['initial'::text, 'corrected'::text, 'void'::text])))
);


--
-- Name: COLUMN claims.payer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.payer_id IS 'Clearinghouse payer ID for routing';


--
-- Name: COLUMN claims.payer_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.payer_name IS 'Insurance payer name';


--
-- Name: COLUMN claims.claim_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.claim_type IS 'professional (CMS-1500) or institutional (UB-04)';


--
-- Name: COLUMN claims.submission_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.submission_type IS 'initial, corrected, or void';


--
-- Name: COLUMN claims.patient_responsibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.patient_responsibility IS 'Patient copay/deductible amount';


--
-- Name: COLUMN claims.line_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.line_items IS 'Array of line items with procedure codes, charges, units, modifiers';


--
-- Name: COLUMN claims.billing_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.billing_provider IS 'Snapshot of provider details (NPI, Tax ID, Address) at time of claim creation';


--
-- Name: COLUMN claims.service_facility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.service_facility IS 'Snapshot of facility details (Name, NPI, Address) at time of claim creation';


--
-- Name: COLUMN claims.service_date_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.service_date_start IS 'Date of service (start)';


--
-- Name: COLUMN claims.service_date_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.service_date_end IS 'Date of service (end)';


--
-- Name: COLUMN claims.subscriber_relationship; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.subscriber_relationship IS 'Relationship of subscriber to patient';


--
-- Name: COLUMN claims.subscriber; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.subscriber IS 'Snapshot of subscriber demographics and address';


--
-- Name: COLUMN claims.rendering_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.rendering_provider IS 'Rendering provider snapshot (Type 1 NPI, taxonomy)';


--
-- Name: encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    clinician_id uuid,
    date_of_service timestamp without time zone NOT NULL,
    status text DEFAULT 'draft'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    transcript_result_id uuid,
    soap_result_id uuid,
    place_of_service text DEFAULT '11'::text,
    audio_key text,
    encounter_type text,
    chief_complaint text,
    organization_id uuid,
    CONSTRAINT check_pos CHECK ((place_of_service ~ '^[0-9]{2}$'::text))
);


--
-- Name: COLUMN encounters.transcript_result_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encounters.transcript_result_id IS 'Reference to AI transcription result';


--
-- Name: COLUMN encounters.soap_result_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encounters.soap_result_id IS 'Reference to AI SOAP generation result';


--
-- Name: COLUMN encounters.place_of_service; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encounters.place_of_service IS 'Place of Service code (11=Office, 12=Home, 02=Telehealth, etc.)';


--
-- Name: COLUMN encounters.audio_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encounters.audio_key IS 'S3 key for audio file';


--
-- Name: COLUMN encounters.encounter_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encounters.encounter_type IS 'Type of encounter (office_visit, telehealth, etc.)';


--
-- Name: COLUMN encounters.chief_complaint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.encounters.chief_complaint IS 'Chief complaint for the visit';


--
-- Name: clinician_encounters; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clinician_encounters AS
 SELECT id,
    patient_id,
    clinician_id,
    date_of_service,
    status,
    transcript_result_id,
    soap_result_id,
    created_at,
    updated_at
   FROM public.encounters e
  WHERE (clinician_id = (current_setting('app.current_user_id'::text, true))::uuid);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinician_id uuid,
    full_name text NOT NULL,
    dob date,
    gender text,
    phone text,
    email text,
    insurance_provider text,
    insurance_policy_number text,
    created_at timestamp without time zone DEFAULT now(),
    address_street text,
    address_city text,
    address_state text,
    address_zip text,
    insurance_member_id text,
    insurance_group_number text,
    insurance_payer_id text,
    insurance_payer_name text,
    subscriber_id uuid,
    insurance_relationship text DEFAULT 'self'::text,
    plan_name text,
    organization_id uuid,
    primary_clinician_id uuid,
    CONSTRAINT check_gender CHECK ((gender = ANY (ARRAY['M'::text, 'F'::text, 'U'::text, 'O'::text, NULL::text]))),
    CONSTRAINT check_insurance_relationship CHECK ((insurance_relationship = ANY (ARRAY['self'::text, 'spouse'::text, 'child'::text, 'other'::text, NULL::text])))
);


--
-- Name: COLUMN patients.insurance_member_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.insurance_member_id IS 'Insurance member/subscriber ID';


--
-- Name: COLUMN patients.insurance_group_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.insurance_group_number IS 'Insurance group number';


--
-- Name: COLUMN patients.insurance_payer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.insurance_payer_id IS 'Payer ID for clearinghouse routing';


--
-- Name: COLUMN patients.insurance_payer_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.insurance_payer_name IS 'Insurance payer name';


--
-- Name: CONSTRAINT check_gender ON patients; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT check_gender ON public.patients IS 'M=Male, F=Female, U=Unknown, O=Other';


--
-- Name: clinician_patients; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clinician_patients AS
 SELECT id,
    clinician_id,
    full_name,
    dob,
    gender,
    phone,
    email,
    insurance_provider,
    insurance_policy_number,
    created_at
   FROM public.patients
  WHERE (clinician_id = (current_setting('app.current_user_id'::text, true))::uuid);


--
-- Name: insurance_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurance_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    full_name text NOT NULL,
    dob date,
    gender text,
    phone text,
    address_street text,
    address_city text,
    address_state text,
    address_zip text,
    member_id text,
    group_number text,
    plan_name text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: medical_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid NOT NULL,
    code_type text NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    category text,
    confidence_score numeric(3,2),
    is_ai_suggested boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT medical_codes_code_type_check CHECK ((code_type = ANY (ARRAY['ICD'::text, 'CPT'::text]))),
    CONSTRAINT medical_codes_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);


--
-- Name: TABLE medical_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.medical_codes IS 'Stores user-selected medical billing codes (ICD-10 diagnosis and CPT procedure codes) for encounters';


--
-- Name: COLUMN medical_codes.code_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medical_codes.code_type IS 'Type of code: ICD (diagnosis) or CPT (procedure)';


--
-- Name: COLUMN medical_codes.confidence_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medical_codes.confidence_score IS 'AI confidence score (0-1) if code was AI-suggested';


--
-- Name: COLUMN medical_codes.is_ai_suggested; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medical_codes.is_ai_suggested IS 'TRUE if code came from AI suggestions, FALSE if manually added';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text,
    message text,
    type text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    npi text,
    tax_id text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    phone text,
    timezone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    billing_name text,
    billing_npi text,
    billing_tax_id text,
    billing_address_line1 text,
    billing_address_line2 text,
    billing_city text,
    billing_state text,
    billing_postal_code text,
    billing_phone text,
    default_place_of_service text,
    edi_sender_id text,
    edi_receiver_id text,
    edi_sftp_host text,
    edi_sftp_username text,
    edi_sftp_password text,
    edi_sftp_port integer,
    edi_sftp_private_key text,
    fee_schedule jsonb,
    payer_enrollments jsonb,
    billing_defaults jsonb
);


--
-- Name: TABLE organizations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.organizations IS 'Healthcare organizations (clinics, practices). Each organization can have multiple users/clinicians.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'clinician'::text,
    created_at timestamp without time zone DEFAULT now(),
    cognito_id text NOT NULL,
    practitioner_type text,
    license_id text,
    npi text,
    tax_id text,
    taxonomy_code text,
    provider_role text,
    phone text,
    license_state text,
    organization_id uuid,
    is_org_admin boolean DEFAULT false,
    CONSTRAINT chk_users_npi_format CHECK (((npi IS NULL) OR (npi ~ '^[0-9]{10}$'::text))),
    CONSTRAINT chk_users_taxonomy_format CHECK (((taxonomy_code IS NULL) OR (taxonomy_code ~ '^[A-Za-z0-9]{10}$'::text)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Clinician/user accounts with personal provider credentials. Clinic information is stored in organizations table.';


--
-- Name: COLUMN users.practitioner_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.practitioner_type IS 'Provider specialty: Mental Health, Speech Therapy, Physical Therapy, etc.';


--
-- Name: COLUMN users.license_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.license_id IS 'State professional license number';


--
-- Name: COLUMN users.npi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.npi IS 'Personal Type 1 NPI for individual provider (different from organization NPI)';


--
-- Name: COLUMN users.tax_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.tax_id IS 'Personal tax ID (SSN/EIN) for individual provider billing or 1099 reporting';


--
-- Name: COLUMN users.taxonomy_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.taxonomy_code IS 'Personal NUCC provider taxonomy code (10 alphanumeric)';


--
-- Name: COLUMN users.provider_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.provider_role IS 'Role in claims: rendering, billing, or both';


--
-- Name: COLUMN users.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.organization_id IS 'The single organization this user belongs to. A user can only be part of one organization at a time.';


--
-- Name: COLUMN users.is_org_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_org_admin IS 'Whether this user is an admin of their organization (can manage settings, invite users, etc.)';


--
-- Name: users_clinic_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_clinic_backup (
    id uuid,
    email text,
    clinic_name text,
    clinic_address_street text,
    clinic_address_city text,
    clinic_address_state text,
    clinic_address_zip text,
    clinic_phone text,
    clinic_npi text,
    backed_up_at timestamp without time zone
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: ai_feedback ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_pkey PRIMARY KEY (id);


--
-- Name: ai_results ai_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_results
    ADD CONSTRAINT ai_results_pkey PRIMARY KEY (id);


--
-- Name: audio_records audio_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_records
    ADD CONSTRAINT audio_records_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);


--
-- Name: insurance_subscribers insurance_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_subscribers
    ADD CONSTRAINT insurance_subscribers_pkey PRIMARY KEY (id);


--
-- Name: medical_codes medical_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_codes
    ADD CONSTRAINT medical_codes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: users users_cognito_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cognito_id_key UNIQUE (cognito_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_results_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_results_encounter ON public.ai_results USING btree (encounter_id);


--
-- Name: idx_ai_results_flow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_results_flow ON public.ai_results USING btree (flow_name);


--
-- Name: idx_audio_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_encounter ON public.audio_records USING btree (encounter_id);


--
-- Name: idx_claims_billing_provider_npi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_billing_provider_npi ON public.claims USING btree (((billing_provider ->> 'npi'::text))) WHERE (billing_provider ? 'npi'::text);


--
-- Name: idx_claims_clinician; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_clinician ON public.claims USING btree (clinician_id);


--
-- Name: idx_claims_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_encounter ON public.claims USING btree (encounter_id);


--
-- Name: idx_claims_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_organization ON public.claims USING btree (organization_id);


--
-- Name: idx_claims_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_patient ON public.claims USING btree (patient_id);


--
-- Name: idx_claims_payer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_payer_id ON public.claims USING btree (payer_id);


--
-- Name: idx_claims_rendering_provider_npi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_rendering_provider_npi ON public.claims USING btree (((rendering_provider ->> 'npi'::text))) WHERE (rendering_provider ? 'npi'::text);


--
-- Name: idx_claims_service_facility_npi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_service_facility_npi ON public.claims USING btree (((service_facility ->> 'npi'::text))) WHERE (service_facility ? 'npi'::text);


--
-- Name: idx_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_status ON public.claims USING btree (status);


--
-- Name: idx_claims_status_payer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_status_payer ON public.claims USING btree (status, payer_id);


--
-- Name: idx_encounters_audio_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounters_audio_key ON public.encounters USING btree (audio_key);


--
-- Name: idx_encounters_clinician; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounters_clinician ON public.encounters USING btree (clinician_id);


--
-- Name: idx_encounters_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounters_organization ON public.encounters USING btree (organization_id);


--
-- Name: idx_encounters_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounters_patient ON public.encounters USING btree (patient_id);


--
-- Name: idx_encounters_soap_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounters_soap_result ON public.encounters USING btree (soap_result_id);


--
-- Name: idx_encounters_transcript_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encounters_transcript_result ON public.encounters USING btree (transcript_result_id);


--
-- Name: idx_feedback_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_claim ON public.ai_feedback USING btree (claim_id);


--
-- Name: idx_feedback_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_encounter ON public.ai_feedback USING btree (encounter_id);


--
-- Name: idx_medical_codes_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_codes_encounter ON public.medical_codes USING btree (encounter_id);


--
-- Name: idx_medical_codes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_codes_type ON public.medical_codes USING btree (code_type);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_patients_clinician; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_clinician ON public.patients USING btree (clinician_id);


--
-- Name: idx_patients_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_organization ON public.patients USING btree (organization_id);


--
-- Name: idx_patients_primary_clinician; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_primary_clinician ON public.patients USING btree (primary_clinician_id);


--
-- Name: idx_subscribers_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscribers_patient ON public.insurance_subscribers USING btree (patient_id);


--
-- Name: idx_users_npi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_npi ON public.users USING btree (npi);


--
-- Name: idx_users_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_organization ON public.users USING btree (organization_id);


--
-- Name: claims trg_audit_claims; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_claims AFTER INSERT OR DELETE OR UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.audit_event();


--
-- Name: encounters trg_audit_encounters; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_encounters AFTER INSERT OR DELETE OR UPDATE ON public.encounters FOR EACH ROW EXECUTE FUNCTION public.audit_event();


--
-- Name: patients trg_audit_patients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_patients AFTER INSERT OR DELETE OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.audit_event();


--
-- Name: claims trg_claims_update_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_claims_update_timestamp BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: organizations trg_organizations_update_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_organizations_update_timestamp BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: encounters trg_update_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON public.encounters FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: ai_feedback ai_feedback_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE;


--
-- Name: ai_feedback ai_feedback_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;


--
-- Name: ai_results ai_results_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_results
    ADD CONSTRAINT ai_results_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;


--
-- Name: audio_records audio_records_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_records
    ADD CONSTRAINT audio_records_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;


--
-- Name: claims claims_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.users(id);


--
-- Name: claims claims_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;


--
-- Name: claims claims_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: claims claims_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: encounters encounters_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: encounters encounters_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: encounters encounters_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: encounters encounters_soap_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_soap_result_id_fkey FOREIGN KEY (soap_result_id) REFERENCES public.ai_results(id) ON DELETE SET NULL;


--
-- Name: encounters encounters_transcript_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_transcript_result_id_fkey FOREIGN KEY (transcript_result_id) REFERENCES public.ai_results(id) ON DELETE SET NULL;


--
-- Name: insurance_subscribers insurance_subscribers_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_subscribers
    ADD CONSTRAINT insurance_subscribers_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: medical_codes medical_codes_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_codes
    ADD CONSTRAINT medical_codes_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patients patients_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patients patients_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patients patients_primary_clinician_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_primary_clinician_fk FOREIGN KEY (primary_clinician_id) REFERENCES public.users(id);


--
-- Name: patients patients_subscriber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public.insurance_subscribers(id);


--
-- Name: users users_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict VV5Bk0LQ1DSY84IhDT1EhOYqZOLTO4R1xOvAu6Hq7eyeu6fXSGRovE9ngCTMgK0

