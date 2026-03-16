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
