import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreateEncounterSchema, UpdateEncounterSchema, IdParamSchema } from "../../types/zod";
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

let encounterColumnsCache: string[] | null = null;
const getEncounterColumns = async () => {
  if (encounterColumnsCache) return encounterColumnsCache;
  const result = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'encounters'`
  );
  encounterColumnsCache = result.rows.map((r) => r.column_name);
  return encounterColumnsCache;
};

// GET all encounters (scoped to organization)
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
      "SELECT id, patient_id, clinician_id, organization_id, date_of_service, transcript_result_id, soap_result_id, status, created_at, updated_at FROM encounters WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2)) ORDER BY created_at DESC",
      [organization.id, user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching encounters:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET encounter by ID
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
      `SELECT e.id,
              e.patient_id,
              e.clinician_id,
              e.organization_id,
              e.date_of_service,
              e.transcript_result_id,
              e.soap_result_id,
              e.status,
              e.place_of_service,
              e.encounter_type,
              e.chief_complaint,
              e.created_at,
              e.updated_at,
              ar.file_url as audio_key
       FROM encounters e
       LEFT JOIN audio_records ar ON e.id = ar.encounter_id
       WHERE e.id = $1 AND (e.organization_id = $2 OR (e.organization_id IS NULL AND e.clinician_id = $3))
       ORDER BY ar.created_at DESC
       LIMIT 1`,
      [id, organization.id, user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Encounter not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching encounter by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// CREATE a new encounter
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedBody = CreateEncounterSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const {
      patient_id,
      date_of_service,
      transcript_result_id,
      soap_result_id,
      status,
      encounter_type,
      chief_complaint,
    } = validatedData;

    // Check if patient_id exists AND belongs to the organization
    const patientCheck = await query(
      "SELECT id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [patient_id, organization.id, user.id]
    );
    if (patientCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const availableColumns = await getEncounterColumns();

    const columns = ["patient_id", "date_of_service", "clinician_id", "organization_id"];
    const values: any[] = [patient_id, date_of_service, user.id, organization.id];
    const placeholders = ["$1", "$2", "$3", "$4"];
    let idx = 5;

    const optionalFields: Record<string, any> = {
      transcript_result_id,
      soap_result_id,
      status,
      encounter_type,
      chief_complaint,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined && availableColumns.includes(key)) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(value);
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO encounters (${columns.join(
      ", "
    )}) VALUES (${placeholders.join(
      ", "
    )}) RETURNING *`;
    const result = await query(insertQuery, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error creating encounter:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// UPDATE an encounter
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

    const parsedBody = UpdateEncounterSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const { id } = parsedParams.data;

    const { patient_id } = validatedData;

    // If patient_id is being updated, validate it first
    if (patient_id) {
      const patientCheck = await query(
        "SELECT id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
        [patient_id, organization.id, user.id]
      );
      if (patientCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Patient not found" });
      }
    }

    // Verify encounter ownership before updating
    const encounterOwner = await query(
      "SELECT id FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organization.id, user.id]
    );
    if (encounterOwner.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Encounter not found" });
    }

    const availableColumns = await getEncounterColumns();
    const entries = Object.entries(validatedData).filter(
      ([key, value]) =>
        value !== undefined &&
        key !== "clinician_id" &&
        availableColumns.includes(key)
    );

    if (entries.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const fields = entries
      .map(([fieldName], i) => `${fieldName} = $${i + 1}`)
      .join(", ");
    const values = entries.map(([, value]) => value);

    const result = await query(
      `UPDATE encounters SET ${fields} WHERE id = $${values.length + 1
      } RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Encounter not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error updating encounter:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// DELETE an encounter
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
      "DELETE FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3)) RETURNING id",
      [id, organization.id, user.id]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Encounter not found" });
    }

    res.json({ success: true, message: "Encounter deleted successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error deleting encounter:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


export default router;
