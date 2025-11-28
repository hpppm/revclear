import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getAuthenticatedUser } from "../../utils/auth";
import { ensureMembership, getUserOrganization } from "../../utils/organization";
import { OrganizationSchema, JoinOrganizationSchema } from "../../types/zod";
import { query } from "../../config/db";
import { z } from "zod";

const router = Router();

const sendValidationError = (res: Response, error: z.ZodError) => {
  return res.status(400).json({ success: false, errors: error.errors });
};

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
      return res.status(404).json({ success: false, message: "No organization found for user" });
    }

    res.json({ success: true, organization });
  } catch (error) {
    console.error("[GET /api/organizations/me] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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
      return res.status(400).json({ success: false, message: "User already belongs to an organization" });
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

    // Add membership as admin
    await ensureMembership(organization.id, user.id, true);

    res.status(201).json({ success: true, organization });
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
    const orgResult = await query("SELECT * FROM organizations WHERE id = $1", [invitationCode]);
    const organization = orgResult.rows[0];
    if (!organization) {
      return res.status(404).json({ success: false, message: "Organization not found for this code" });
    }

    await ensureMembership(organization.id, user.id, false);

    res.json({ success: true, organization });
  } catch (error: any) {
    if (error?.code === "23505") {
      // Unique violation on membership
      return res.status(200).json({ success: true, message: "Already a member" });
    }
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("[POST /api/organizations/join] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PATCH /api/organizations/me - update current organization fields (billing/config)
router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    let organization = await getUserOrganization(user.id);

    // Auto-create organization if user doesn't have one
    if (!organization) {
      const insertOrg = await query(
        `INSERT INTO organizations (name) VALUES ($1) RETURNING *`,
        [user.full_name ? `${user.full_name}'s Practice` : `Practice`]
      );
      organization = insertOrg.rows[0];
      await ensureMembership(organization.id, user.id, true);
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
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(organization.id);
    const updateResult = await query(
      `UPDATE organizations SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    const updated = updateResult.rows[0];

    // Ensure membership exists (no-op if already)
    await ensureMembership(updated.id, user.id, false);

    res.json({ success: true, organization: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("[PATCH /api/organizations/me] Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
