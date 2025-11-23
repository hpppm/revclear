import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreateEncounterSchema, UpdateEncounterSchema, IdParamSchema } from "../../types/zod";
import { z } from "zod";

const router = Router();

const sendValidationError = (res: Response, error: z.ZodError) => {
  return res.status(400).json({ success: false, errors: error.errors });
};

// GET all encounters
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, patient_id, clinician_id, date_of_service, subjective, objective, assessment, plan, status, ai_confidence, created_at, updated_at FROM encounters"
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
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const result = await query(
      "SELECT id, patient_id, clinician_id, date_of_service, subjective, objective, assessment, plan, status, ai_confidence, created_at, updated_at FROM encounters WHERE id = $1",
      [id]
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
    const parsedBody = CreateEncounterSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const {
      patient_id,
      clinician_id,
      date_of_service,
      subjective,
      objective,
      assessment,
      plan,
      status,
      ai_confidence,
    } = validatedData;

    // Check if patient_id exists
    const patientCheck = await query("SELECT id FROM patients WHERE id = $1", [
      patient_id,
    ]);
    if (patientCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const columns = ["patient_id", "date_of_service"];
    const values: any[] = [patient_id, date_of_service];
    const placeholders = ["$1", "$2"];
    let idx = 3;

    const optionalFields: Record<string, any> = {
      clinician_id,
      subjective,
      objective,
      assessment,
      plan,
      status,
      ai_confidence,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined) {
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
    )}) RETURNING id, patient_id, clinician_id, date_of_service, subjective, objective, assessment, plan, status, ai_confidence, created_at, updated_at`;
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
      const patientCheck = await query("SELECT id FROM patients WHERE id = $1", [
        patient_id,
      ]);
      if (patientCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Patient not found" });
      }
    }

    // Explicitly check for non-empty update data
    if (Object.keys(validatedData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    // Dynamically build the update query
    const fields = Object.keys(validatedData)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");
    const values = Object.values(validatedData);

    const result = await query(
      `UPDATE encounters SET ${fields} WHERE id = $${
        values.length + 1
      } RETURNING id, patient_id, clinician_id, date_of_service, subjective, objective, assessment, plan, status, ai_confidence, created_at, updated_at`,
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
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;
    const result = await query(
      "DELETE FROM encounters WHERE id = $1 RETURNING id",
      [id]
    );

    // Correctly handle "not found" cases
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
