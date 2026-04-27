import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry } from "../config/swagger";
import { APP_ROLES, ORGANIZATION_MEMBER_ROLES } from "../constants/roles";

extendZodWithOpenApi(z);

// User/Provider Schemas
export const UserSchema = z.object({
  email: z.string().email("Invalid email address").openapi({ example: "doctor@example.com" }),
  full_name: z.string().min(1, "Full name is required").openapi({ example: "Dr. John Doe" }),
  role: z.enum(APP_ROLES).optional().openapi({ example: "clinician" }),
  phone: z.string().optional().openapi({ example: "555-123-4567" }),
  // Personal provider credentials (NOT clinic information)
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits").optional().openapi({ example: "1234567890" }),
  tax_id: z.string().optional().openapi({ example: "12-3456789" }),
  taxonomy_code: z
    .string()
    .regex(/^[A-Za-z0-9]{10}$/, "Taxonomy code must be 10 alphanumeric characters")
    .optional()
    .openapi({ example: "207Q00000X" }),
  provider_role: z.enum(["rendering", "billing", "both"]).optional().openapi({ example: "rendering" }),
  practitioner_type: z.string().optional().openapi({ example: "Physician" }),
  license_id: z.string().optional().openapi({ example: "MD12345" }),
  license_state: z.string().optional().openapi({ example: "NY" }),
}).openapi("User");

registry.register("User", UserSchema);

export const UpdateUserSchema = UserSchema.partial();

// Organization Schemas
export const OrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").openapi({ example: "City Medical Group" }),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits").optional().openapi({ example: "9876543210" }),
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
  edi_clearinghouse_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  edi_clearinghouse_api_key: z.string().optional(),
  edi_sftp_host: z.string().optional(),
  edi_sftp_username: z.string().optional(),
  edi_sftp_password: z.string().optional(),
  edi_sftp_port: z.number().int().optional(),
  edi_sftp_private_key: z.string().optional(),
  fee_schedule: z.any().optional(),
  payer_enrollments: z.any().optional(),
  billing_defaults: z.any().optional(),
}).openapi("Organization");

registry.register("Organization", OrganizationSchema);

export const JoinOrganizationSchema = z.object({
  invitationCode: z.string().min(1, "Invitation code is required"),
});

export const CreateOrganizationInviteSchema = z.object({
  role: z.enum(ORGANIZATION_MEMBER_ROLES).openapi({ example: "nurse" }),
});

// Patient Schemas (align with schema: full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number)
export const PatientSchema = z.object({
  full_name: z.string().min(1, "Full name is required").openapi({ example: "Jane Doe" }),
  dob: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/, "DOB must be in YYYY-MM-DD or ISO format")
    ])
    .transform((val) => val ? val.split('T')[0] : val)
    .optional()
    .nullable()
    .openapi({ example: "1980-01-01" }),
  gender: z.enum(["M", "F", "U", "O"]).optional().nullable().openapi({ example: "F" }),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  // Address fields
  address_street: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip: z.string().optional().nullable(),
  // Insurance fields
  insurance_provider: z.string().optional().nullable(),
  insurance_policy_number: z.string().min(6).max(15).optional().nullable(),
  insurance_member_id: z.string().min(8).max(11).optional().nullable(),
  insurance_group_number: z.string().optional().nullable(),
  insurance_payer_id: z.string().optional().nullable(),
  insurance_payer_name: z.string().optional().nullable(),
  insurance_relationship: z.enum(["self", "spouse", "child", "other"]).optional().nullable(),
  subscriber_id: z.string().uuid().optional().nullable(),
  plan_name: z.string().optional().nullable(),
}).openapi("Patient");

registry.register("Patient", PatientSchema);

export const CreatePatientSchema = PatientSchema.extend({
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/, "DOB must be in YYYY-MM-DD or ISO format")
    .transform((val) => val ? val.split('T')[0] : val)
    .refine((d) => new Date(d) >= new Date("1900-01-01"), "Date of birth cannot be before 1900-01-01")
    .refine((d) => new Date(d) < new Date(), "Date of birth cannot be in the future"),
  gender: z.enum(["M", "F", "U", "O"], { errorMap: () => ({ message: "Gender is required" }) }),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  address_street: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z.string().regex(/^[A-Za-z]{2}$/, "State must be a 2-letter abbreviation"),
  address_zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be valid (e.g. 16501)"),
  insurance_provider: z.string().min(1, "Insurance provider is required"),
}).superRefine((data, ctx) => {
  if (data.insurance_provider && data.insurance_provider !== "SELF_PAY") {
    if (!data.insurance_policy_number) {
      ctx.addIssue({ code: "custom", path: ["insurance_policy_number"], message: "Policy number is required" });
    }
    if (!data.insurance_member_id) {
      ctx.addIssue({ code: "custom", path: ["insurance_member_id"], message: "Member ID is required" });
    }
  }
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
    )
    .openapi({ example: "2023-10-27" }),
  clinician_id: z.string().uuid().optional(),
  transcript_result_id: z.string().uuid().optional().nullable(),
  soap_result_id: z.string().uuid().optional().nullable(),
  status: z.string().optional().openapi({ example: "completed" }),
  // Billing fields
  place_of_service: z.string().regex(/^[0-9]{2}$/, "POS must be 2-digit code").optional().openapi({ example: "11" }),
  audio_key: z.string().optional(),
  encounter_type: z.string().optional(),
  chief_complaint: z.string().optional(),
}).openapi("Encounter");

registry.register("Encounter", EncounterSchema);

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
