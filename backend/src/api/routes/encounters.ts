import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreateEncounterSchema, UpdateEncounterSchema } from "../../types/zod";
import { z } from "zod";

const router = Router();

// GET all encounters
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT id, patient_id, encounter_date, type, created_at FROM encounters");
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching encounters:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET encounter by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT id, patient_id, encounter_date, type, created_at FROM encounters WHERE id = $1", [id]);
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
    const validatedData = CreateEncounterSchema.parse(req.body);
    const { patient_id, encounter_date, type } = validatedData;

    // Check if patient_id exists
    const patientCheck = await query("SELECT id FROM patients WHERE id = $1", [
      patient_id,
    ]);
    if (patientCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const result = await query(
      "INSERT INTO encounters (patient_id, encounter_date, type) VALUES ($1, $2, $3) RETURNING id, patient_id, encounter_date, type, created_at",
      [patient_id, encounter_date, type]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    // Add a generic error handler for other database errors
    res.status(400).json({
      success: false,
      message: "Failed to create encounter due to invalid data.",
    });
  }
});

// UPDATE an encounter
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateEncounterSchema.parse(req.body);

    // Explicitly check for non-empty update data
    if (Object.keys(validatedData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const { patient_id, ...otherFields } = validatedData;

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

    // Dynamically build the update query
    const fields = Object.keys(validatedData)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");
    const values = Object.values(validatedData);

    const result = await query(
      `UPDATE encounters SET ${fields} WHERE id = $${
        values.length + 1
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
      return res.status(400).json({ success: false, message: error.errors });
    }
    // Handle cases where the encounter to update is not found
    res.status(404).json({
      success: false,
      message: "Encounter not found or invalid data provided.",
    });
  }
});

// DELETE an encounter
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
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
    // Add a generic error handler for unexpected issues
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


export default router;

