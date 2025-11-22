import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreatePatientSchema, UpdatePatientSchema } from "../../types/zod";
import { z } from "zod";

const router = Router();

// GET all patients
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT id, full_name, date_of_birth, gender, created_at FROM patients");
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET patient by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT id, full_name, date_of_birth, gender, created_at FROM patients WHERE id = $1", [id]);
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
    const validatedData = CreatePatientSchema.parse(req.body);
    const { full_name, date_of_birth, gender } = validatedData;
    const result = await query(
      "INSERT INTO patients (full_name, date_of_birth, gender) VALUES ($1, $2, $3) RETURNING id, full_name, date_of_birth, gender, created_at",
      [full_name, date_of_birth, gender]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    console.error("Error creating patient:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// UPDATE a patient
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = UpdatePatientSchema.parse(req.body);
    const { full_name, date_of_birth, gender } = validatedData;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (date_of_birth !== undefined) {
      fields.push(`date_of_birth = $${paramIndex++}`);
      values.push(date_of_birth);
    }
    if (gender !== undefined) {
      fields.push(`gender = $${paramIndex++}`);
      values.push(gender);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(id); // Add id to the end of values for the WHERE clause

    const queryText = `UPDATE patients SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING id, full_name, date_of_birth, gender, created_at`;
    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    console.error("Error updating patient:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE a patient
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM patients WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

