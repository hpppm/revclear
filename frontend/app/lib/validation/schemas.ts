import { z } from 'zod';

// SECURITY: Response validation schemas to detect unexpected data from backend
// These schemas enforce defense-in-depth by validating API responses

export const OrganizationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  npi: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billing_name: z.string().optional().nullable(),
  billing_npi: z.string().optional().nullable(),
  billing_tax_id: z.string().optional().nullable(),
  billing_address_line1: z.string().optional().nullable(),
  billing_address_line2: z.string().optional().nullable(),
  billing_city: z.string().optional().nullable(),
  billing_state: z.string().optional().nullable(),
  billing_postal_code: z.string().optional().nullable(),
  billing_phone: z.string().optional().nullable(),
  default_place_of_service: z.string().optional().nullable(),
  edi_sender_id: z.string().optional().nullable(),
  edi_receiver_id: z.string().optional().nullable(),
  edi_sftp_host: z.string().optional().nullable(),
  edi_sftp_username: z.string().optional().nullable(),
  edi_sftp_port: z.number().optional().nullable(),
  // SECURITY: These fields should NEVER be present in API responses.
  // z.never() causes parse() to throw if they appear in the response,
  // catching any backend regression that accidentally leaks credentials.
  edi_sftp_password: z.never().optional(),
  edi_sftp_private_key: z.never().optional(),
  // SECURITY: .strip() (not .passthrough()) is required for z.never() guards
  // to work. .passthrough() would silently forward unknown fields — including
  // any accidentally leaked SFTP credentials — to React state.
}).strip();

// SECURITY: .strip() drops unrecognised fields so future backend additions
// do not silently flow into React state before the schema is updated.
export const EncounterSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  date_of_service: z.string(),
  status: z.enum(["draft", "scheduled", "in_progress", "ready_for_review", "ready", "completed", "archived"]),
  organization_id: z.string().uuid().optional(),
  clinician_id: z.string().uuid().optional(),
  audio_key: z.string().optional().nullable(),
  transcript_result_id: z.string().uuid().optional().nullable(),
  soap_result_id: z.string().uuid().optional().nullable(),
  codes_result_id: z.string().uuid().optional().nullable(),
  place_of_service: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  patient_name: z.string().optional().nullable(),
}).strip();

// SECURITY: .strip() — unknown fields are dropped, not forwarded.
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.enum(["admin", "clinician", "billing_staff"]),
  organization_id: z.string().uuid().optional().nullable(),
}).strip();

// ── Form input schemas ────────────────────────────────────────────────────────
// These validate user input before it is sent to the API.
// Distinct from the response schemas above which guard against unexpected data
// flowing back from the backend.

const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-(). ]{7,15}$/, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

const zipSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code (e.g. 16501)")
  .optional()
  .or(z.literal(""));

const npiSchema = z
  .string()
  .regex(/^\d{10}$/, "NPI must be exactly 10 digits")
  .optional()
  .or(z.literal(""));

const dobPastSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((d: string) => !d || new Date(d) < new Date(), "Date of birth cannot be in the future")
  .optional()
  .or(z.literal(""));

export const LoginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const SignupFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const ForgotPasswordConfirmSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// Shared required patient fields used by both create and edit
const patientRequiredFields = {
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((d: string) => new Date(d) < new Date(), "Date of birth cannot be in the future"),
  gender: z.enum(["M", "F", "U", "O"], { error: "Gender is required" }),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-(). ]{7,15}$/, "Please enter a valid phone number"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  address_street: z.string().min(1, "Street address is required").max(200),
  address_city: z.string().min(1, "City is required").max(100),
  address_state: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "State must be a 2-letter abbreviation (e.g. PA)"),
  address_zip: z
    .string()
    .min(1, "ZIP code is required")
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code (e.g. 16501)"),
  insurance_provider: z.string().min(1, "Insurance provider is required").max(100),
  insurance_policy_number: z.string().max(50).optional().or(z.literal("")),
  insurance_member_id: z.string().max(50).optional().or(z.literal("")),
  insurance_group_number: z.string().max(50).optional().or(z.literal("")),
  insurance_payer_id: z.string().max(50).optional().or(z.literal("")),
  insurance_payer_name: z.string().max(100).optional().or(z.literal("")),
};

// When insurance_provider is not SELF_PAY, policy number and member ID are required
function enforceInsuranceFields(
  data: { insurance_provider?: string; insurance_policy_number?: string; insurance_member_id?: string },
  ctx: z.RefinementCtx,
) {
  if (data.insurance_provider && data.insurance_provider !== "SELF_PAY") {
    if (!data.insurance_policy_number) {
      ctx.addIssue({ code: "custom", path: ["insurance_policy_number"], message: "Policy number is required" });
    }
    if (!data.insurance_member_id) {
      ctx.addIssue({ code: "custom", path: ["insurance_member_id"], message: "Member ID is required" });
    }
  }
}

export const CreatePatientFormSchema = z
  .object(patientRequiredFields)
  .superRefine(enforceInsuranceFields);

export const EditPatientFormSchema = z
  .object(patientRequiredFields)
  .superRefine(enforceInsuranceFields);

export const ProfileFormSchema = z.object({
  phone: phoneSchema,
  practitioner_type: z.string().max(100).optional().or(z.literal("")),
  license_id: z.string().max(50).optional().or(z.literal("")),
  license_state: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "License state must be a 2-letter abbreviation (e.g. CA)")
    .optional()
    .or(z.literal("")),
  npi: npiSchema,
  taxonomy_code: z
    .string()
    .regex(/^[A-Za-z0-9]{10}$/, "Taxonomy code must be exactly 10 alphanumeric characters")
    .optional()
    .or(z.literal("")),
});

export const OrganizationFormSchema = z.object({
  name: z.string().max(200).optional().or(z.literal("")),
  npi: npiSchema,
  tax_id: z.string().max(20).optional().or(z.literal("")),
  address_line1: z.string().max(200).optional().or(z.literal("")),
  address_line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postal_code: zipSchema,
  phone: phoneSchema,
  billing_name: z.string().max(200).optional().or(z.literal("")),
  billing_npi: npiSchema,
  billing_tax_id: z.string().max(20).optional().or(z.literal("")),
  billing_address_line1: z.string().max(200).optional().or(z.literal("")),
  billing_address_line2: z.string().max(200).optional().or(z.literal("")),
  billing_city: z.string().max(100).optional().or(z.literal("")),
  billing_state: z.string().max(2).optional().or(z.literal("")),
  billing_postal_code: zipSchema,
  billing_phone: phoneSchema,
  default_place_of_service: z.string().max(10).optional().or(z.literal("")),
  edi_sender_id: z.string().max(50).optional().or(z.literal("")),
  edi_receiver_id: z.string().max(50).optional().or(z.literal("")),
  edi_sftp_host: z.string().max(200).optional().or(z.literal("")),
  edi_sftp_username: z.string().max(100).optional().or(z.literal("")),
  edi_sftp_port: z
    .string()
    .refine(
      (v: string) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535),
      "Port must be a number between 1 and 65535"
    )
    .optional()
    .or(z.literal("")),
});

export const EncounterDetailsFormSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((d: string) => new Date(d) <= new Date(), "Date of service cannot be in the future"),
  encounterType: z.enum(["office_visit", "telehealth", "phone", "home_visit"]),
  chiefComplaint: z.string().max(500).optional().or(z.literal("")),
});

export const SubscriberFormSchema = z.object({
  full_name: z.string().min(2, "Subscriber name must be at least 2 characters").max(100),
  dob: dobPastSchema,
  phone: phoneSchema,
  address_zip: zipSchema,
  member_id: z.string().max(50).optional().or(z.literal("")),
  group_number: z.string().max(50).optional().or(z.literal("")),
});
