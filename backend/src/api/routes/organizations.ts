import { Router, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import {
  assignUserToOrganization,
  getUserOrganization,
} from "../../utils/organization";
import { getAuthenticatedUser } from "../../utils/auth";
import { JoinOrganizationSchema, OrganizationSchema } from "../../types/zod";

const router = Router();

// SECURITY: Strip sensitive fields from organization responses to prevent credential exposure
const SENSITIVE_ORG_FIELDS = ['edi_sftp_password', 'edi_sftp_private_key'] as const;
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

    res.json({ success: true, organization: stripSensitiveOrgFields(organization) });
  } catch (error) {
    console.error("[GET /api/organizations/me] Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch organization" });
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
      return res
        .status(400)
        .json({ success: false, message: "User already belongs to an organization" });
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
       RETURNING *`,
      values
    );
    const organization = insertOrg.rows[0];

    // Assign user to organization as admin (enforces one org per user via users.organization_id)
    await assignUserToOrganization(user.id, organization.id, true);

    res.status(201).json({ success: true, organization: stripSensitiveOrgFields(organization) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("[POST /api/organizations] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/organizations/join - join an organization via invitation code (currently uses organization id)
router.post("/join", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = JoinOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const { invitationCode } = parsed.data;

    // Using organization id as invitation code for now
    // SECURITY: Only select non-sensitive fields
    const orgResult = await query("SELECT id, name, npi, city, state FROM organizations WHERE id = $1", [
      invitationCode,
    ]);
    const organization = orgResult.rows[0];
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found for this code" });
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

    await assignUserToOrganization(user.id, organization.id, false);

    res.json({ success: true, organization: stripSensitiveOrgFields(organization) });
  } catch (error: any) {
    if (error?.code === "23505") {
      // Unique violation on membership
      return res.status(200).json({ success: true, message: "Already a member" });
    }
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("[POST /api/organizations/join] Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
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
        message: "User is not assigned to an organization. Create or join one first.",
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
      } RETURNING *`,
      values
    );
    const updated = updateResult.rows[0];

    res.json({ success: true, organization: stripSensitiveOrgFields(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("[PATCH /api/organizations/me] Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;
