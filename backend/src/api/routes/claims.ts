import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreateClaimSchema, UpdateClaimSchema, IdParamSchema } from "../../types/zod";
import { z } from "zod";

const router = Router();

const sendValidationError = (res: Response, error: z.ZodError) => {
  return res.status(400).json({ success: false, errors: error.errors });
};

// GET all claims
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status, rejection_reason, submission_date, payment_date, created_at, updated_at FROM claims"
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET claim by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const result = await query(
      "SELECT id, encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status, rejection_reason, submission_date, payment_date, created_at, updated_at FROM claims WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching claim by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// CREATE a new claim
router.post("/", authMiddleware, async (req, res) => {
  try {
    const parsedBody = CreateClaimSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const {
      encounter_id,
      clinician_id,
      patient_id,
      diagnosis_codes,
      procedure_codes,
      total_amount,
      insurance_provider,
      status,
      rejection_reason,
      submission_date,
      payment_date,
    } = validatedData;

    // Check if encounter_id exists
    const encounterCheck = await query("SELECT id FROM encounters WHERE id = $1", [
      encounter_id,
    ]);
    if (encounterCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Encounter not found" });
    }

    const columns = ["encounter_id"];
    const values: any[] = [encounter_id];
    const placeholders = ["$1"];
    let idx = 2;

    const optionalFields: Record<string, any> = {
      clinician_id,
      patient_id,
      diagnosis_codes,
      procedure_codes,
      total_amount,
      insurance_provider,
      status,
      rejection_reason,
      submission_date,
      payment_date,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(value);
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO claims (${columns.join(
      ", "
    )}) VALUES (${placeholders.join(
      ", "
    )}) RETURNING id, encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status, rejection_reason, submission_date, payment_date, created_at, updated_at`;
    const result = await query(insertQuery, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error creating claim:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// UPDATE a claim
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }

    const parsedBody = UpdateClaimSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const { id } = parsedParams.data;

    const { encounter_id } = validatedData;

    // If encounter_id is being updated, validate it first
    if (encounter_id) {
      const encounterCheck = await query("SELECT id FROM encounters WHERE id = $1", [
        encounter_id,
      ]);
      if (encounterCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Encounter not found" });
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
      `UPDATE claims SET ${fields} WHERE id = $${values.length + 1
      } RETURNING id, encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status, rejection_reason, submission_date, payment_date, created_at, updated_at`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Claim not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error updating claim:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// DELETE a claim
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;
    const result = await query(
      "DELETE FROM claims WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Claim not found" });
    }

    res.json({ success: true, message: "Claim deleted successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error deleting claim:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
