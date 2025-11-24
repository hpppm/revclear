import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreatePatientSchema, UpdatePatientSchema, IdParamSchema } from "../../types/zod";
import { z } from "zod";

const router = Router();

const sendValidationError = (res: Response, error: z.ZodError) => {
  return res.status(400).json({ success: false, errors: error.errors });
};

// GET all patients for the authenticated clinician
router.get("/", authMiddleware, async (req, res) => {
  try {
    const cognitoId = (req as any).user?.sub;
    if (!cognitoId) {
      console.error("No Cognito ID in token:", (req as any).user);
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Get user ID from database using Cognito ID
    const userResult = await query(
      "SELECT id FROM users WHERE cognito_id = $1",
      [cognitoId]
    );

    if (userResult.rows.length === 0) {
      console.error("User not found for Cognito ID:", cognitoId);
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      "SELECT id, clinician_id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, created_at FROM patients WHERE clinician_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET patient by ID (only if owned by authenticated clinician)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const cognitoId = (req as any).user?.sub;
    if (!cognitoId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Get user ID from database
    const userResult = await query(
      "SELECT id FROM users WHERE cognito_id = $1",
      [cognitoId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      "SELECT id, clinician_id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, created_at FROM patients WHERE id = $1 AND clinician_id = $2",
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching patient by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// CREATE a new patient
router.post("/", authMiddleware, async (req, res) => {
  try {
    const parsedBody = CreatePatientSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const {
      full_name,
      dob,
      gender,
      phone,
      email,
      insurance_provider,
      insurance_policy_number,
    } = parsedBody.data;

    // Get user ID from Cognito token
    const cognitoId = (req as any).user?.sub;
    if (!cognitoId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const userResult = await query(
      "SELECT id FROM users WHERE cognito_id = $1",
      [cognitoId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // Start with required fields including clinician_id
    const columns = ["full_name", "clinician_id"];
    const values: any[] = [full_name, userId];
    const placeholders = ["$1", "$2"];
    let idx = 3;

    const optionalFields: Record<string, any> = {
      dob,
      gender,
      phone,
      email,
      insurance_provider,
      insurance_policy_number,
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
    )}) VALUES (${placeholders.join(", ")}) RETURNING id, clinician_id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, created_at`;
    const result = await query(insertQuery, values);

    res.status(201).json({ success: true, data: result.rows[0] });
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

    const fields = Object.entries(validatedData).map(
      ([key], index) => `${key} = $${index + 1}`
    );
    const values = Object.values(validatedData);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const queryText = `UPDATE patients SET ${fields.join(
      ", "
    )} WHERE id = $${fields.length + 1} RETURNING id, clinician_id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, created_at`;
    const result = await query(queryText, [...values, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, data: result.rows[0] });
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
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const result = await query("DELETE FROM patients WHERE id = $1 RETURNING id", [id]);
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
