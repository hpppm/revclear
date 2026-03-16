-- Migration 020: enable relational PHI field encryption rollout
-- Purpose: allow mixed-mode plaintext/encrypted storage for PHI-bearing
-- patients, insurance_subscribers, and encounters fields without breaking
-- legacy reads during rollout.
-- Safe to run multiple times: YES

DROP VIEW IF EXISTS public.clinician_patients;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patients'
      AND column_name = 'dob'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.patients
      ALTER COLUMN dob TYPE text
      USING CASE
        WHEN dob IS NULL THEN NULL
        ELSE to_char(dob, 'YYYY-MM-DD')
      END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'insurance_subscribers'
      AND column_name = 'dob'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.insurance_subscribers
      ALTER COLUMN dob TYPE text
      USING CASE
        WHEN dob IS NULL THEN NULL
        ELSE to_char(dob, 'YYYY-MM-DD')
      END;
  END IF;
END $$;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS check_gender,
  DROP CONSTRAINT IF EXISTS check_insurance_relationship;

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
