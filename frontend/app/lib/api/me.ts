import { z } from "zod";
import api from "./axios";
import { deduplicateGet } from "./deduplicate";

// SECURITY: Explicit schema blocks injection of privileged fields.
// Callers cannot send organization_id, role, is_admin, cognito_id, or
// any other server-controlled field through the profile update endpoint.

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  practitioner_type: z.string().optional().nullable(),
  license_id: z.string().optional().nullable(),
  license_state: z.string().optional().nullable(),
  npi: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  taxonomy_code: z.string().optional().nullable(),
  provider_role: z.enum(["rendering", "billing", "both"]).optional().nullable(),
});

export type ProfileUpdatePayload = z.infer<typeof ProfileUpdateSchema>;

export const meApi = {
  getProfile: () => deduplicateGet("me.getProfile", () => api.get("/me")),

  updateProfile: (payload: ProfileUpdatePayload) =>
    api.patch("/me", ProfileUpdateSchema.parse(payload)),
};
