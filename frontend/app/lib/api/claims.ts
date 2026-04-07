import { z } from "zod";
import api from "./axios";

// SECURITY: Explicit schemas strip any injected internal fields
// (organization_id, clinician_id, patient_id) that callers must not control.
// IDs are validated as UUIDs and encoded before URL injection.

const UUID = z.string().uuid("Invalid claim ID format");

const ClaimUpdateSchema = z.object({
  status: z.string().optional(),
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
});

export type ClaimUpdatePayload = z.infer<typeof ClaimUpdateSchema>;

const ClaimCreateSchema = z.object({
  // encounter_id is required — backend verifies ownership server-side
  encounter_id: z.string().uuid(),
  payer_id: z.string().optional().nullable(),
  payer_name: z.string().optional().nullable(),
  claim_type: z.enum(["professional", "institutional"]).optional(),
  submission_type: z.enum(["initial", "corrected", "void"]).optional(),
  diagnosis_codes: z.array(z.string()).optional(),
  procedure_codes: z.array(z.string()).optional(),
  total_amount: z.number().nonnegative().optional(),
  patient_responsibility: z.number().nonnegative().optional(),
  insurance_provider: z.string().optional().nullable(),
  line_items: z.array(z.object({
    line_number: z.number(),
    procedure_code: z.string(),
    modifiers: z.array(z.string()).optional(),
    diagnosis_pointers: z.array(z.number()).optional(),
    units: z.number(),
    charge_amount: z.number(),
    place_of_service: z.string().optional(),
    date_of_service: z.string().optional(),
  })).optional(),
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
};
