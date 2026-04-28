import { z } from "zod";
import api from "./axios";

// SECURITY: Explicit schemas strip any injected internal fields
// (organization_id, clinician_id, patient_id) that callers must not control.
// IDs are validated as UUIDs and encoded before URL injection.

const UUID = z.string().uuid("Invalid claim ID format");

const LineItemSchema = z.object({
  line_number: z.number(),
  procedure_code: z.string(),
  modifiers: z.array(z.string()).optional(),
  diagnosis_pointers: z.array(z.number()).optional(),
  units: z.number(),
  charge_amount: z.number(),
  place_of_service: z.string().optional(),
  date_of_service: z.string().optional(),
  description: z.string().optional(),
});

const ProviderSchema = z.object({
  name: z.string().optional().nullable(),
  npi: z.string().optional().nullable(),
  organization_npi: z.string().optional().nullable(),
  clinic_npi: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  taxonomy_code: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  address: z.object({
    street: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
  }).optional().nullable(),
});

const FacilitySchema = z.object({
  name: z.string().optional().nullable(),
  npi: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  place_of_service: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  address: z.object({
    street: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
  }).optional().nullable(),
});

const SubscriberSchema = z.object({
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
});

// Shared writable fields for both create and update
const ClaimBaseSchema = z.object({
  payer_id: z.string().optional().nullable(),
  payer_name: z.string().optional().nullable(),
  claim_type: z.enum(["professional", "institutional"]).optional(),
  submission_type: z.enum(["initial", "corrected", "void"]).optional(),
  diagnosis_codes: z.array(z.string()).optional(),
  procedure_codes: z.array(z.string()).optional(),
  total_amount: z.number().nonnegative().optional(),
  patient_responsibility: z.number().nonnegative().optional(),
  insurance_provider: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
  service_date_start: z.string().optional().nullable(),
  service_date_end: z.string().optional().nullable(),
  subscriber_relationship: z.string().optional().nullable(),
  line_items: z.array(LineItemSchema).optional(),
  billing_provider: ProviderSchema.optional(),
  service_facility: FacilitySchema.optional(),
  rendering_provider: ProviderSchema.optional(),
  subscriber: SubscriberSchema.optional(),
});

const ClaimUpdateSchema = ClaimBaseSchema.extend({
  status: z.string().optional(),
});

export type ClaimUpdatePayload = z.infer<typeof ClaimUpdateSchema>;

const ClaimCreateSchema = ClaimBaseSchema.extend({
  // encounter_id is required — backend verifies ownership server-side
  encounter_id: z.string().uuid(),
});

export type ClaimCreatePayload = z.infer<typeof ClaimCreateSchema>;

const safeId = (id: string) => encodeURIComponent(UUID.parse(id));

export const claimsApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    api.get("/claims", { params }),

  getById: (id: string) => api.get(`/claims/${safeId(id)}`),

  create: (data: ClaimCreatePayload) =>
    api.post("/claims", ClaimCreateSchema.parse(data)),

  update: (id: string, data: ClaimUpdatePayload) =>
    api.put(`/claims/${safeId(id)}`, ClaimUpdateSchema.parse(data)),

  delete: (id: string) => api.delete(`/claims/${safeId(id)}`),

  submit: (id: string) => api.post(`/claims/${safeId(id)}/submit`),

  getStatusHistory: (id: string) => api.get(`/claims/${safeId(id)}/status-history`),

  download: (id: string) => api.get(`/claims/${safeId(id)}/download`, { responseType: "blob" }),
};
