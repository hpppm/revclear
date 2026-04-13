import { z } from "zod";
import api from "./axios";

// SECURITY: Explicit schema for SOAP update payload — blocks injection of
// internal fields (encounter_id, clinician_id) from callers.

const SoapUpdateSchema = z.object({
  soap: z.object({
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
  }),
  model_version: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

export type SoapUpdatePayload = z.infer<typeof SoapUpdateSchema>;

const safeId = (id: string) => encodeURIComponent(z.string().uuid().parse(id));

export const soapApi = {
  getForEncounter: (encounterId: string) =>
    api.get(`/encounters/${safeId(encounterId)}/soap`),

  generateFromTranscript: (encounterId: string) =>
    api.post(`/encounters/${safeId(encounterId)}/soap`),

  update: (encounterId: string, data: SoapUpdatePayload) =>
    api.put(`/encounters/${safeId(encounterId)}/soap`, SoapUpdateSchema.parse(data)),
};
