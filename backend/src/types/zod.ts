import { z } from "zod";

// User/Provider Schemas
export const UserSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required"),
  role: z.string().optional(),
  phone: z.string().optional(),
  // Personal provider credentials (NOT clinic information)
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits").optional(),
  tax_id: z.string().optional(),
  taxonomy_code: z
    .string()
    .regex(/^[A-Za-z0-9]{10}$/, "Taxonomy code must be 10 alphanumeric characters")
    .optional(),
  provider_role: z.enum(["rendering", "billing", "both"]).optional(),
  practitioner_type: z.string().optional(),
  license_id: z.string().optional(),
  license_state: z.string().optional(),
});

export const UpdateUserSchema = UserSchema.partial();

// Organization Schemas
export const OrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits").optional(),
  tax_id: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  billing_name: z.string().optional(),
  billing_npi: z.string().regex(/^\d{10}$/, "Billing NPI must be 10 digits").optional(),
  billing_tax_id: z.string().optional(),
  billing_address_line1: z.string().optional(),
  billing_address_line2: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_phone: z.string().optional(),
  default_place_of_service: z.string().regex(/^[0-9]{2}$/, "POS must be 2-digit code").optional(),
  edi_sender_id: z.string().optional(),
  edi_receiver_id: z.string().optional(),
  edi_sftp_host: z.string().optional(),
  edi_sftp_username: z.string().optional(),
  edi_sftp_password: z.string().optional(),
  edi_sftp_port: z.number().int().optional(),
  edi_sftp_private_key: z.string().optional(),
  fee_schedule: z.any().optional(),
  payer_enrollments: z.any().optional(),
  billing_defaults: z.any().optional(),
});

export const JoinOrganizationSchema = z.object({
  invitationCode: z.string().min(1, "Invitation code is required"),
});

// Patient Schemas (align with schema: full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number)
export const PatientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/, "DOB must be in YYYY-MM-DD or ISO format")
    .transform((val) => val ? val.split('T')[0] : val)
    .optional(),
  gender: z.enum(["M", "F", "U", "O"]).optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  // Address fields
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  // Insurance fields
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_member_id: z.string().optional(),
  insurance_group_number: z.string().optional(),
  insurance_payer_id: z.string().optional(),
  insurance_payer_name: z.string().optional(),
  insurance_relationship: z.enum(["self", "spouse", "child", "other"]).optional(),
  subscriber_id: z.string().uuid().optional(),
  plan_name: z.string().optional(),
});

export const CreatePatientSchema = PatientSchema.extend({
  // full_name required; rest optional
});

export const UpdatePatientSchema = PatientSchema.partial(); // All fields optional for update

// Subscriber Schemas
export const SubscriberSchema = z.object({
  full_name: z.string().min(1, "Subscriber name is required"),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DOB must be YYYY-MM-DD").optional(),
  gender: z.enum(["M", "F", "U", "O"]).optional(),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  member_id: z.string().optional(),
  group_number: z.string().optional(),
  plan_name: z.string().optional(),
});

export const UpsertSubscriberSchema = SubscriberSchema.extend({
  relationship: z.enum(["self", "spouse", "child", "other"]).optional(),
});

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
  // Billing fields
  place_of_service: z.string().regex(/^[0-9]{2}$/, "POS must be 2-digit code").optional(),
  audio_key: z.string().optional(),
  encounter_type: z.string().optional(),
  chief_complaint: z.string().optional(),
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
  clinician_id: z.string().uuid("Clinician ID must be a valid UUID").optional().nullable(),
  patient_id: z.string().uuid("Patient ID must be a valid UUID").optional().nullable(),
  diagnosis_codes: z
    .union([z.array(z.string()), z.record(z.string())])
    .optional()
    .transform((val) => (val && !Array.isArray(val) ? Object.values(val) : val as any)),
  procedure_codes: z
    .union([z.array(z.string()), z.record(z.string())])
    .optional()
    .transform((val) => (val && !Array.isArray(val) ? Object.values(val) : val as any)),
  total_amount: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === undefined || val === null) return undefined;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
  insurance_provider: z.string().optional(),
  status: z.string().optional(),
  rejection_reason: z.string().optional().nullable(),
  submission_date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/,
      "submission_date must be in YYYY-MM-DD or ISO format"
    )
    .optional()
    .nullable(),
  payment_date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/,
      "payment_date must be in YYYY-MM-DD or ISO format"
    )
    .optional()
    .nullable(),
  // New claim fields
  payer_id: z.union([z.string(), z.number()]).optional(),
  payer_name: z.union([z.string(), z.number()]).optional(),
  claim_type: z.enum(["professional", "institutional"]).optional(),
  submission_type: z.enum(["initial", "corrected", "void"]).optional(),
  patient_responsibility: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === undefined || val === null) return undefined;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
  service_date_start: z.string().optional(),
  service_date_end: z.string().optional(),
  subscriber_relationship: z.string().optional(),
  line_items: z
    .union([
      z.array(z.object({
        line_number: z.number(),
        procedure_code: z.string(),
        modifiers: z.union([z.array(z.string()), z.record(z.string())]).optional().transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : Object.values(val);
        }),
        diagnosis_pointers: z.union([z.array(z.number()), z.record(z.number())]).optional().transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : Object.values(val);
        }),
        units: z.number(),
        charge_amount: z.number(),
        place_of_service: z.string().optional(),
        date_of_service: z.string().optional(),
        description: z.string().optional(),
      })),
      z.record(z.object({
        line_number: z.number(),
        procedure_code: z.string(),
        modifiers: z.union([z.array(z.string()), z.record(z.string())]).optional().transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : Object.values(val);
        }),
        diagnosis_pointers: z.union([z.array(z.number()), z.record(z.number())]).optional().transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : Object.values(val);
        }),
        units: z.number(),
        charge_amount: z.number(),
        place_of_service: z.string().optional(),
        date_of_service: z.string().optional(),
        description: z.string().optional(),
      }))
    ])
    .optional()
    .transform((val) => {
      if (!val) return val as any;
      return Array.isArray(val) ? val : Object.values(val);
    }),
  billing_provider: z.object({
    npi: z.union([z.string(), z.number()]).optional().nullable(),
    tax_id: z.union([z.string(), z.number()]).optional().nullable(),
    organization_npi: z.union([z.string(), z.number()]).optional().nullable(),
    clinic_npi: z.union([z.string(), z.number()]).optional().nullable(),
    phone: z.union([z.string(), z.number()]).optional().nullable(),
    taxonomy_code: z.union([z.string(), z.number()]).optional().nullable(),
    address: z
      .union([
        z.string(),
        z.object({
          street: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          zip: z.union([z.string(), z.number()]).optional().nullable(),
        }),
      ])
      .optional()
      .nullable(),
    street: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.union([z.string(), z.number()]).optional().nullable(),
    name: z.string().optional().nullable(),
  }).optional(),
  service_facility: z.object({
    name: z.string().optional().nullable(),
    npi: z.union([z.string(), z.number()]).optional().nullable(),
    phone: z.union([z.string(), z.number()]).optional().nullable(),
    place_of_service: z.string().optional().nullable(),
    address: z
      .union([
        z.string(),
        z.object({
          street: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          zip: z.union([z.string(), z.number()]).optional().nullable(),
        }),
      ])
      .optional()
      .nullable(),
    street: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.union([z.string(), z.number()]).optional().nullable(),
  }).optional(),
  rendering_provider: z.object({
    name: z.string().optional().nullable(),
    npi: z.union([z.string(), z.number()]).optional().nullable(),
    taxonomy_code: z.union([z.string(), z.number()]).optional().nullable(),
  }).optional(),
  subscriber: z.object({
    full_name: z.string().optional().nullable(),
    dob: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    member_id: z.string().optional().nullable(),
    group_number: z.string().optional().nullable(),
    relationship: z.string().optional().nullable(),
    address_street: z.string().optional().nullable(),
    address_city: z.string().optional().nullable(),
    address_state: z.string().optional().nullable(),
    address_zip: z.string().optional().nullable(),
  }).optional(),
});

export const CreateClaimSchema = ClaimSchema.extend({
  // encounter_id is required, others optional
});

export const UpdateClaimSchema = ClaimSchema.partial();
