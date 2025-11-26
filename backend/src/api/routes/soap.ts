import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { IdParamSchema } from "../../types/zod";
import { createAiResult, getLatestAiResult } from "../../db/queries";
import { sendError } from "../../utils/httpResponses";
import { speechToSoap } from "../../../genkit";
import { query } from "../../config/db";

const router = Router();

const SoapPayloadSchema = z.object({
  soap: z.object({
    subjective: z.string().min(1, "subjective is required"),
    objective: z.string().min(1, "objective is required"),
    assessment: z.string().min(1, "assessment is required"),
    plan: z.string().min(1, "plan is required"),
  }),
  model_version: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

const parseTranscriptText = (payload: any) => {
  if (!payload) return undefined;
  if (typeof payload === "string") return payload;
  if (typeof payload.text === "string" && payload.text.trim().length > 0) {
    return payload.text;
  }
  if (payload.transcript && typeof payload.transcript === "string") {
    return payload.transcript;
  }
  return JSON.stringify(payload);
};

// New endpoint specifically for testing with mock transcript
// MUST come before POST /:id/soap to avoid route conflict
router.post("/:id/soap/mock", authMiddleware, async (req, res) => {
  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  try {
    console.log(`[POST /api/encounters/:id/soap/mock] Forcing mock transcript usage`);

    // Force empty transcript to trigger mock
    const soapResult = await speechToSoap({
      encounter_id: encounterId,
      transcript: "", // Empty string forces mock usage
    });

    console.log(`[POST /api/encounters/:id/soap/mock] SOAP Result:`, JSON.stringify(soapResult, null, 2));

    const saved = await createAiResult({
      encounter_id: encounterId,
      flow_name: "soap_gemini",
      input_json: { transcript_id: "mock", source: "mock_endpoint" },
      output_json: soapResult,
      model_version: soapResult.model_version,
      confidence_score: soapResult.confidence,
    });

    // Update encounter to reference this SOAP result
    await query(
      `UPDATE encounters SET soap_result_id = $1 WHERE id = $2`,
      [saved.id, encounterId]
    );

    return res.status(201).json({
      success: true,
      data: saved.output_json,
      metadata: {
        model_version: saved.model_version,
        confidence_score: saved.confidence_score,
        created_at: saved.created_at,
        source: "mock_transcript",
      },
    });
  } catch (error: any) {
    console.error("[POST /api/encounters/:id/soap/mock] error", error);
    return sendError(res, 500, error.message || "Failed to generate SOAP note from mock");
  }
});

router.get("/:id/soap", authMiddleware, async (req, res) => {
  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  try {
    const latest = await getLatestAiResult(encounterId, "soap_gemini");
    if (!latest) {
      return sendError(res, 404, "No SOAP note found for encounter");
    }

    return res.json({
      success: true,
      data: latest.output_json,
      metadata: {
        model_version: latest.model_version,
        confidence_score: latest.confidence_score,
        created_at: latest.created_at,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/encounters/:id/soap] error", error);
    return sendError(res, 500, "Failed to fetch SOAP note");
  }
});

router.post("/:id/soap", authMiddleware, async (req, res) => {
  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  try {
    // Try to get transcript from database
    const transcript = await getLatestAiResult(encounterId, "whisper_transcript");

    let transcriptText = "";
    if (transcript) {
      transcriptText = parseTranscriptText(transcript.output_json) || "";
      console.log(`[POST /api/encounters/:id/soap] Found transcript in DB, length: ${transcriptText.length}`);
    } else {
      console.log(`[POST /api/encounters/:id/soap] No transcript in DB, will use mock transcript`);
    }

    // Call speechToSoap - it will use mock transcript if transcriptText is empty
    const soapResult = await speechToSoap({
      encounter_id: encounterId,
      transcript: transcriptText,
    });

    console.log(`[POST /api/encounters/:id/soap] SOAP Result:`, JSON.stringify(soapResult, null, 2));

    const saved = await createAiResult({
      encounter_id: encounterId,
      flow_name: "soap_gemini",
      input_json: { transcript_id: transcript?.id || "mock" },
      output_json: soapResult,
      model_version: soapResult.model_version,
      confidence_score: soapResult.confidence,
    });

    // Update encounter to reference this SOAP result
    await query(
      `UPDATE encounters SET soap_result_id = $1 WHERE id = $2`,
      [saved.id, encounterId]
    );

    return res.status(201).json({
      success: true,
      data: saved.output_json,
      metadata: {
        model_version: saved.model_version,
        confidence_score: saved.confidence_score,
        created_at: saved.created_at,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/encounters/:id/soap] error", error);
    return sendError(res, 500, error.message || "Failed to generate SOAP note");
  }
});

router.put("/:id/soap", authMiddleware, async (req, res) => {
  const parsedParams = IdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 400, "Invalid encounter id", parsedParams.error.issues);
  }
  const parsedBody = SoapPayloadSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 400, "Invalid SOAP payload", parsedBody.error.issues);
  }

  const encounterId = parsedParams.data.id;
  const { soap, model_version, confidence_score } = parsedBody.data;

  try {
    const saved = await createAiResult({
      encounter_id: encounterId,
      flow_name: "soap_gemini",
      input_json: { source: "manual_edit" },
      output_json: { soap },
      model_version: model_version ?? "manual_edit",
      confidence_score: confidence_score ?? undefined,
    });

    // Update encounter to reference this SOAP result
    await query(
      `UPDATE encounters SET soap_result_id = $1 WHERE id = $2`,
      [saved.id, encounterId]
    );

    return res.json({
      success: true,
      data: saved.output_json,
      metadata: {
        model_version: saved.model_version,
        confidence_score: saved.confidence_score,
        created_at: saved.created_at,
      },
    });
  } catch (error: any) {
    console.error("[PUT /api/encounters/:id/soap] error", error);
    return sendError(res, 500, "Failed to save SOAP note");
  }
});

export default router;
