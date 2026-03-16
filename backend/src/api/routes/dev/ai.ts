import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth";
import { speechToSoap } from "../../../services/ai/speechToSoap";
import { query } from "../../../config/db";
import { createAiResult } from "../../../db/queries";
import { AI_FLOW_NAMES } from "../../../constants/aiFlows";
import logger from "../../../utils/logger";
import { encryptPHIText } from "../../../utils/crypto";

const router = Router();

router.post("/speech-to-soap", authMiddleware, async (req, res) => {
  const { encounter_id, transcript } = req.body || {};

  if (!encounter_id) {
    return res.status(400).json({
      success: false,
      error: "encounter_id is required",
    });
  }

  try {
    // 1. Ensure encounter exists (for mock testing)
    const encounterCheck = await query("SELECT id FROM encounters WHERE id = $1", [encounter_id]);

    if (encounterCheck.rows.length === 0) {
      logger.debug({ encounter_id }, 'dev/ai: encounter not found, creating mock data');

      // Get a clinician (use the first one found or the logged in user if possible)
      // Since this is a dev route, we'll just grab the first user
      const userResult = await query("SELECT id FROM users LIMIT 1");
      if (userResult.rows.length === 0) {
        throw new Error("No users found in database. Please create a user first.");
      }
      const clinicianId = userResult.rows[0].id;

      // Create mock patient
      const patientResult = await query(
        `INSERT INTO patients (full_name, clinician_id, dob, gender) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [
          encryptPHIText("Mock Patient"),
          clinicianId,
          encryptPHIText("1980-01-01"),
          encryptPHIText("O"),
        ]
      );
      const patientId = patientResult.rows[0].id;

      // Create mock encounter
      await query(
        `INSERT INTO encounters (id, patient_id, clinician_id, date_of_service, status)
         VALUES ($1, $2, $3, NOW(), 'draft')`,
        [encounter_id, patientId, clinicianId]
      );
      logger.debug({ encounter_id }, 'dev/ai: created mock encounter');
    }

    // 2. Run the AI generation flow
    const result = await speechToSoap({
      encounter_id,
      transcript,
    });

    // 3. Save result to ai_results
    const saved = await createAiResult({
      encounter_id,
      flow_name: AI_FLOW_NAMES.soapNote,
      input_json: { transcript: transcript || "mock", source: "dev_panel" },
      output_json: result,
      model_version: result.model_version,
      confidence_score: result.confidence,
    });

    // 4. Update encounter to reference this SOAP result
    await query(
      `UPDATE encounters SET soap_result_id = $1 WHERE id = $2`,
      [saved.id, encounter_id]
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'dev/ai: speechToSoap error');
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to run speechToSoap flow",
    });
  }
});

export default router;
