import { Router, Response } from "express";
import { z } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { query } from "../../config/db";
import {
  assignUserToOrganization,
  getUserOrganization,
} from "../../utils/organization";
import { getAuthenticatedUser } from "../../utils/auth";
import { JoinOrganizationSchema, OrganizationSchema } from "../../types/zod";
import { generateInviteToken, hashInviteToken } from "../../utils/crypto";
import logger from "../../utils/logger";

const router = Router();

// Invite token expiry: 7 days
const INVITE_TOKEN_EXPIRY_DAYS = 7;

// SECURITY: Explicit column list for organization queries - excludes SFTP credentials at SQL level
// This prevents sensitive data from ever leaving the database, even in memory
const ORG_SAFE_COLUMNS = `
    id, name, npi, tax_id, address_line1, address_line2, city, state, postal_code, phone, timezone,
    billing_name, billing_npi, billing_tax_id, billing_address_line1, billing_address_line2,
    billing_city, billing_state, billing_postal_code, billing_phone,
    default_place_of_service, edi_sender_id, edi_receiver_id, edi_sftp_host, edi_sftp_username, edi_sftp_port,
    fee_schedule, payer_enrollments, billing_defaults, created_at, updated_at
`
  .replace(/\s+/g, " ")
  .trim();

// SECURITY: Strip sensitive fields from organization responses (defense-in-depth)
const SENSITIVE_ORG_FIELDS = [
  "edi_sftp_password",
  "edi_sftp_private_key",
] as const;
function stripSensitiveOrgFields(org: any): any {
  if (!org) return org;
  const { edi_sftp_password, edi_sftp_private_key, ...safeOrg } = org;
  return safeOrg;
}

const sendValidationError = (res: Response, error: z.ZodError) =>
  res.status(400).json({ success: false, errors: error.errors });

const requireUser = async (req: any, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "User not authenticated" });
    return null;
  }
  return user;
};

// GET /api/organizations/me - current organization for the authenticated user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return res.json({
        success: true,
        requiresOrganization: true,
        message: "User must create or join an organization.",
        organization: null,
      });
    }

    res.json({
      success: true,
      organization: stripSensitiveOrgFields(organization),
    });
  } catch (error) {
    logger.error({ err: error }, 'GET organizations/me: error');
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch organization" });
  }
});

// POST /api/organizations - create a new organization and add the user as admin
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = OrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const data = parsed.data;

    // Prevent creating multiple orgs if already a member
    const existingOrg = await getUserOrganization(user.id);
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: "User already belongs to an organization",
      });
    }

    const columns = ["name"];
    const values: any[] = [data.name];
    const placeholders = ["$1"];
    let idx = 2;

    const optionalFields: Record<string, any> = {
      npi: data.npi,
      tax_id: data.tax_id,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      phone: data.phone,
      timezone: data.timezone,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(value);
        idx += 1;
      }
    }

    const insertOrg = await query(
      `INSERT INTO organizations (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING ${ORG_SAFE_COLUMNS}`,
      values,
    );
    const organization = insertOrg.rows[0];

    // Assign user to organization as admin (enforces one org per user via users.organization_id)
    await assignUserToOrganization(user.id, organization.id, true);

    res.status(201).json({
      success: true,
      organization: stripSensitiveOrgFields(organization),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    logger.error({ err: error }, 'POST organizations: error');
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/organizations/join - join an organization via cryptographic invitation token
router.post("/join", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = JoinOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const { invitationCode } = parsed.data;

    // Hash the provided token to look up in database
    const tokenHash = hashInviteToken(invitationCode);

    // Look up the invite token (hashed for security)
    const inviteResult = await query(
      `SELECT organization_id, expires_at, used_at 
       FROM organization_invites 
       WHERE token_hash = $1`,
      [tokenHash],
    );

    const invite = inviteResult.rows[0];
    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invitation code",
      });
    }

    // Check if already used
    if (invite.used_at) {
      return res.status(400).json({
        success: false,
        message: "This invitation code has already been used",
      });
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This invitation code has expired",
      });
    }

    // Get organization details
    const orgResult = await query(
      "SELECT id, name, npi, city, state FROM organizations WHERE id = $1",
      [invite.organization_id],
    );
    const organization = orgResult.rows[0];
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user already has an organization
    const existingOrg = await getUserOrganization(user.id);
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message:
          "User already belongs to an organization. Leave current organization first.",
      });
    }

    // Mark invite as used
    await query(
      "UPDATE organization_invites SET used_at = NOW(), used_by = $1 WHERE token_hash = $2",
      [user.id, tokenHash],
    );

    await assignUserToOrganization(user.id, organization.id, false);

    res.json({
      success: true,
      organization: stripSensitiveOrgFields(organization),
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      // Unique violation on membership
      return res
        .status(200)
        .json({ success: true, message: "Already a member" });
    }
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    logger.error({ err: error }, 'POST organizations/join: error');
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/organizations/invite - generate a new invitation token (admin only)
router.post("/invite", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "User must belong to an organization to create invites",
      });
    }

    // Generate cryptographic token
    const rawToken = generateInviteToken();
    const tokenHash = hashInviteToken(rawToken);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

    // Store hashed token (never store raw token)
    await query(
      `INSERT INTO organization_invites (organization_id, token_hash, created_by, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [organization.id, tokenHash, user.id, expiresAt],
    );

    res.status(201).json({
      success: true,
      invitationCode: rawToken, // Return raw token to user (only time it's visible)
      expiresAt: expiresAt.toISOString(),
      message: `Invitation code valid for ${INVITE_TOKEN_EXPIRY_DAYS} days. Share this code securely.`,
    });
  } catch (error) {
    logger.error({ err: error }, 'POST organizations/invite: error');
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PATCH /api/organizations/me - update current organization fields (billing/config)
router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    let organization = await getUserOrganization(user.id);

    // Do not auto-create; require org setup explicitly
    if (!organization) {
      return res.status(404).json({
        success: false,
        message:
          "User is not assigned to an organization. Create or join one first.",
      });
    }

    const parsed = OrganizationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const data = parsed.data;

    const updatableFields: Array<keyof typeof data> = [
      "name",
      "npi",
      "tax_id",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "postal_code",
      "phone",
      "timezone",
      "billing_name",
      "billing_npi",
      "billing_tax_id",
      "billing_address_line1",
      "billing_address_line2",
      "billing_city",
      "billing_state",
      "billing_postal_code",
      "billing_phone",
      "default_place_of_service",
      "edi_sender_id",
      "edi_receiver_id",
      "edi_sftp_host",
      "edi_sftp_username",
      "edi_sftp_password",
      "edi_sftp_port",
      "edi_sftp_private_key",
      "fee_schedule",
      "payer_enrollments",
      "billing_defaults",
    ];

    const sets: string[] = [];
    const values: any[] = [];
    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        values.push(data[field]);
        sets.push(`${field} = $${values.length}`);
      }
    });

    if (sets.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    values.push(organization.id);
    const updateResult = await query(
      `UPDATE organizations SET ${sets.join(", ")} WHERE id = $${
        values.length
      } RETURNING ${ORG_SAFE_COLUMNS}`,
      values,
    );
    const updated = updateResult.rows[0];

    res.json({ success: true, organization: stripSensitiveOrgFields(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    logger.error({ err: error }, 'PATCH organizations/me: error');
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
