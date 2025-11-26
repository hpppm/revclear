import { z } from "zod";

// Patient Schemas (align with schema: full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number)
export const PatientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "DOB must be in YYYY-MM-DD format")
    .optional(),
  gender: z.string().min(1, "Gender is required").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
});

export const CreatePatientSchema = PatientSchema.extend({
  // full_name required; rest optional
});

export const UpdatePatientSchema = PatientSchema.partial(); // All fields optional for update

// Encounter Schemas (new schema: patient_id, clinician_id, date_of_service, transcript_result_id, soap_result_id, status)
export const EncounterSchema = z.object({
  patient_id: z.string().uuid("Patient ID must be a valid UUID"),
  date_of_service: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/,
      "date_of_service must be in YYYY-MM-DD or ISO format"
    ),
  clinician_id: z.string().uuid().optional(),
  transcript_result_id: z.string().uuid().optional().nullable(),
  soap_result_id: z.string().uuid().optional().nullable(),
  status: z.string().optional(),
});

export const CreateEncounterSchema = EncounterSchema.extend({
  // patient_id and date_of_service required; rest optional
});

export const UpdateEncounterSchema = EncounterSchema.partial(); // All fields optional for update

// Shared Schemas
export const IdParamSchema = z.object({
  id: z.string().uuid("Invalid id format"),
});

// Claim Schemas
export const ClaimSchema = z.object({
  encounter_id: z.string().uuid("Encounter ID must be a valid UUID"),
  clinician_id: z.string().uuid("Clinician ID must be a valid UUID").optional(),
  patient_id: z.string().uuid("Patient ID must be a valid UUID").optional(),
  diagnosis_codes: z.array(z.string()).optional(),
  procedure_codes: z.array(z.string()).optional(),
  total_amount: z.number().optional(),
  insurance_provider: z.string().optional(),
  status: z.string().optional(),
  rejection_reason: z.string().optional(),
  submission_date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/,
      "submission_date must be in YYYY-MM-DD or ISO format"
    )
    .optional(),
  payment_date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/,
      "payment_date must be in YYYY-MM-DD or ISO format"
    )
    .optional(),
});

export const CreateClaimSchema = ClaimSchema.extend({
  // encounter_id is required, others optional
});

export const UpdateClaimSchema = ClaimSchema.partial();
