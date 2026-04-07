import { z } from "zod";
import api from "./axios";

// SECURITY: Explicit schemas strip any injected internal fields
// (organization_id, clinician_id). IDs are validated as UUIDs and encoded
// before URL injection to prevent path traversal.
// encounter_id is NOT included in generateClaim — the backend derives it
// from the URL parameter, preventing client-side ID spoofing.

const UUID = z.string().uuid("Invalid encounter ID format");

const EncounterWriteSchema = z.object({
  patient_id: z.string().uuid(),
  date_of_service: z.string().optional(),
  status: z
    .enum(["draft", "scheduled", "in_progress", "ready_for_review", "ready", "completed", "archived"])
    .optional(),
  place_of_service: z.string().optional().nullable(),
  encounter_type: z.string().optional().nullable(),
  chief_complaint: z.string().optional().nullable(),
});

const EncounterUpdateSchema = EncounterWriteSchema.partial();

export type EncounterCreatePayload = z.infer<typeof EncounterWriteSchema>;
export type EncounterUpdatePayload = z.infer<typeof EncounterUpdateSchema>;

const safeId = (id: string) => encodeURIComponent(UUID.parse(id));

export const encountersApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    api.get("/encounters", { params }),

  getAllByPatient: (patientId: string) =>
    api.get(`/encounters?patient_id=${encodeURIComponent(UUID.parse(patientId))}`),

  getById: (id: string) => api.get(`/encounters/${safeId(id)}`),

  create: (data: EncounterCreatePayload) =>
    api.post("/encounters", EncounterWriteSchema.parse(data)),

  update: (id: string, data: EncounterUpdatePayload) =>
    api.put(`/encounters/${safeId(id)}`, EncounterUpdateSchema.parse(data)),

  delete: (id: string) => api.delete(`/encounters/${safeId(id)}`),

  getClaim: (id: string) => api.get(`/claims/encounter/${safeId(id)}`),

  previewClaim: (id: string) => api.get(`/claims/encounter/${safeId(id)}/preview`),

  // SECURITY: Only encounter_id is sent — all other claim fields (organization_id,
  // clinician_id, patient_id) are derived server-side from the authenticated session.
  // The backend's CreateClaimSchema validates this and scopes by org + clinician.
  generateClaim: (id: string) => api.post(`/claims`, { encounter_id: UUID.parse(id) }),
};
