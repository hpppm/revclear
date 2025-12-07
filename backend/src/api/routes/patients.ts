import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreatePatientSchema, UpdatePatientSchema, IdParamSchema, UpsertSubscriberSchema } from "../../types/zod";
import { z } from "zod";
import { getAuthenticatedUser } from "../../utils/auth";
import { getUserOrganization } from "../../utils/organization";

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

const requireOrganization = async (user: any, res: Response) => {
  const organization = await getUserOrganization(user.id);
  if (!organization) {
    res.status(400).json({ success: false, message: "User must join or create an organization first" });
    return null;
  }
  return organization;
};

// Helper to enrich patient with subscriber details
const enrichPatientWithSubscriber = async (patient: any) => {
  if (patient?.subscriber_id) {
    const subRes = await query("SELECT * FROM insurance_subscribers WHERE id = $1", [patient.subscriber_id]);
    const subscriber = subRes.rows[0] || null;
    return { ...patient, subscriber };
  }
  return patient;
};

// GET all patients for the authenticated clinician (scoped to organization)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return res.json({
        success: true,
        requiresOrganization: true,
        message: "User must join or create an organization first",
        data: [],
      });
    }

    const result = await query(
      "SELECT * FROM patients WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2)) ORDER BY created_at DESC",
      [organization.id, user.id]
    );
    const enriched = await Promise.all(result.rows.map(enrichPatientWithSubscriber));
    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Upsert subscriber for a patient (one per patient)
router.put("/:id/subscriber", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const patientId = parsedParams.data.id;

    const parsedBody = UpsertSubscriberSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const data = parsedBody.data;

    const patientResult = await query(
      "SELECT id, subscriber_id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [patientId, organization.id, user.id]
    );
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    const currentSubscriberId = patientResult.rows[0].subscriber_id;

    let subscriber;
    const relationship = data.relationship || "other";
    if (currentSubscriberId) {
      // Update existing
      const fields = Object.entries(data).map(
        ([key], index) => `${key} = $${index + 1}`
      );
      const values = Object.values(data);
      const updated = await query(
        `UPDATE insurance_subscribers SET ${fields.join(", ")} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, currentSubscriberId]
      );
      subscriber = updated.rows[0];
      await query(
        "UPDATE patients SET insurance_relationship = $1 WHERE id = $2",
        [relationship, patientId]
      );
    } else {
      // Create new
      const columns = ["patient_id"];
      const values: any[] = [patientId];
      const placeholders = ["$1"];
      let idx = 2;
      Object.entries(data).forEach(([key, value]) => {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(value);
        idx += 1;
      });
      const inserted = await query(
        `INSERT INTO insurance_subscribers (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        values
      );
      subscriber = inserted.rows[0];
      await query(
        "UPDATE patients SET subscriber_id = $1, insurance_relationship = $2 WHERE id = $3",
        [subscriber.id, relationship, patientId]
      );
    }

    res.json({ success: true, data: subscriber });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error upserting subscriber:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get subscriber for a patient
router.get("/:id/subscriber", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const patientId = parsedParams.data.id;

    const patientResult = await query(
      "SELECT subscriber_id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [patientId, organization.id, user.id]
    );
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const subscriberId = patientResult.rows[0].subscriber_id;
    if (!subscriberId) {
      return res.json({ success: true, data: null });
    }

    const subscriberResult = await query(
      "SELECT * FROM insurance_subscribers WHERE id = $1",
      [subscriberId]
    );

    if (subscriberResult.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: subscriberResult.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error fetching subscriber:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET patient by ID (only if owned by authenticated clinician/org)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const result = await query(
      "SELECT * FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organization.id, user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    const enriched = await enrichPatientWithSubscriber(result.rows[0]);
    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching patient by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// CREATE a new patient
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedBody = CreatePatientSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const data = parsedBody.data;

    const columns = ["full_name", "clinician_id", "organization_id", "primary_clinician_id"];
    const values: any[] = [data.full_name, user.id, organization.id, user.id];
    const placeholders = ["$1", "$2", "$3", "$4"];
    let idx = 5;

    const optionalFields: Record<string, any> = {
      dob: data.dob,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      address_street: data.address_street,
      address_city: data.address_city,
      address_state: data.address_state,
      address_zip: data.address_zip,
      insurance_provider: data.insurance_provider,
      insurance_policy_number: data.insurance_policy_number,
      insurance_member_id: data.insurance_member_id,
      insurance_group_number: data.insurance_group_number,
      insurance_payer_id: data.insurance_payer_id,
      insurance_payer_name: data.insurance_payer_name,
      insurance_relationship: data.insurance_relationship,
      subscriber_id: data.subscriber_id,
      plan_name: data.plan_name,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(value);
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO patients (${columns.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const result = await query(insertQuery, values);

    const enriched = await enrichPatientWithSubscriber(result.rows[0]);
    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error creating patient:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// UPDATE a patient
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }

    const parsedBody = UpdatePatientSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const { id } = parsedParams.data;

    const ownershipCheck = await query(
      "SELECT id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organization.id, user.id]
    );
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const fields = Object.entries(validatedData).map(
      ([key], index) => `${key} = $${index + 1}`
    );
    const values = Object.values(validatedData);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const queryText = `UPDATE patients SET ${fields.join(
      ", "
    )} WHERE id = $${fields.length + 1} RETURNING *`;
    const result = await query(queryText, [...values, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    const enriched = await enrichPatientWithSubscriber(result.rows[0]);
    res.json({ success: true, data: enriched });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error updating patient:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE a patient
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const result = await query(
      "DELETE FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3)) RETURNING id",
      [id, organization.id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error deleting patient:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
