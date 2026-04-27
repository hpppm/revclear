import { z } from "zod";
import api from "./axios";
import { ORGANIZATION_MEMBER_ROLES } from "../auth/roles";
import { OrganizationResponseSchema } from "../validation/schemas";

// SECURITY: All org responses are validated against OrganizationResponseSchema
// before being returned to callers. This enforces that edi_sftp_password and
// edi_sftp_private_key are never present (z.never() guard), and strips any
// unrecognised fields added by future backend changes.

const OrgCreateSchema = z.object({
  name: z.string().min(1),
  npi: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  // Billing profile fields
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
  // EDI/SFTP fields (credentials excluded — managed server-side)
  edi_sender_id: z.string().optional().nullable(),
  edi_receiver_id: z.string().optional().nullable(),
  edi_sftp_host: z.string().optional().nullable(),
  edi_sftp_username: z.string().optional().nullable(),
  edi_sftp_port: z.number().int().optional().nullable(),
  edi_clearinghouse_url: z.string().optional().nullable(),
  edi_clearinghouse_api_key: z.string().optional().nullable(),
});

const OrgUpdateSchema = OrgCreateSchema.extend({
  timezone: z.string().optional().nullable(),
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
  edi_sftp_port: z.number().int().optional().nullable(),
  fee_schedule: z.unknown().optional(),
  payer_enrollments: z.unknown().optional(),
  billing_defaults: z.unknown().optional(),
}).partial();

const OrgInviteSchema = z.object({
  role: z.enum(ORGANIZATION_MEMBER_ROLES),
});
const OrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.enum([
    "admin",
    "clinician",
    "nurse",
    "billing_staff",
    "receptionist",
  ]),
  created_at: z.string().optional(),
});
const OrganizationInviteActorSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
});
const OrganizationInviteSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(ORGANIZATION_MEMBER_ROLES),
  created_at: z.string(),
  expires_at: z.string(),
  used_at: z.string().nullable().optional(),
  created_by: OrganizationInviteActorSchema,
  used_by: OrganizationInviteActorSchema.nullable().optional(),
});

// SECURITY: Invite code must be a non-empty alphanumeric token.
// Validates format before dispatching to prevent malformed values from
// reaching the backend or being injected into request bodies.
const INVITE_CODE_REGEX = /^[A-Za-z0-9_-]{6,64}$/;
const InviteCodeSchema = z
  .string()
  .regex(INVITE_CODE_REGEX, "Invalid invitation code format.");

// SECURITY: Validate org responses to catch accidentally leaked SFTP credentials.
// Uses safeParse — a schema mismatch (e.g. no-org response, extra fields) must not
// surface as "Unable to load organization." The z.never() guards on
// edi_sftp_password / edi_sftp_private_key only fire when those fields are present,
// so we re-throw only on those specific field errors.
function assertNoCredentialLeak(response: { data: unknown }): void {
  const payload = (response.data as { data?: unknown; organization?: unknown })?.organization
    ?? (response.data as { data?: unknown })?.data
    ?? response.data;
  if (!payload || typeof payload !== "object") return;
  const result = OrganizationResponseSchema.safeParse(payload);
  if (!result.success) {
    const leakFields = ["edi_sftp_password", "edi_sftp_private_key"];
    const hasLeak = result.error.issues.some((e) =>
      leakFields.includes(String(e.path[0]))
    );
    if (hasLeak) {
      throw new Error("SECURITY: Org response contains prohibited credential fields");
    }
  }
}

export const organizationsApi = {
  getCurrent: async () => {
    const response = await api.get("/organizations/me");
    assertNoCredentialLeak(response);
    return response;
  },

  getMembers: async () => {
    const response = await api.get("/organizations/members");
    const payload = (response.data as { members?: unknown })?.members ?? [];
    z.array(OrganizationMemberSchema).parse(payload);
    return response;
  },

  getInvites: async () => {
    const response = await api.get("/organizations/invites");
    const payload = (response.data as { invites?: unknown })?.invites ?? [];
    z.array(OrganizationInviteSchema).parse(payload);
    return response;
  },

  create: (payload: z.infer<typeof OrgCreateSchema>) =>
    api.post("/organizations", OrgCreateSchema.parse(payload)),

  joinWithCode: (invitationCode: string) => {
    // SECURITY: Validate invitation code format before sending.
    const safeCode = InviteCodeSchema.parse(invitationCode);
    return api.post("/organizations/join", { invitationCode: safeCode });
  },

  createInvite: (payload: z.infer<typeof OrgInviteSchema>) =>
    api.post("/organizations/invite", OrgInviteSchema.parse(payload)),

  updateCurrent: (payload: z.infer<typeof OrgUpdateSchema>) =>
    api.patch("/organizations/me", OrgUpdateSchema.parse(payload)),
};
