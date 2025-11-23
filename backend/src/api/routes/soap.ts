import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { IdParamSchema } from "../../types/zod";
import { createAiResult, getLatestAiResult } from "../../db/queries";
import { sendError } from "../../utils/httpResponses";
import { speechToSoap } from "../../../genkit";

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
    const transcript = await getLatestAiResult(encounterId, "whisper_transcript");
    if (!transcript) {
      return sendError(res, 404, "No transcript found for encounter");
    }

    const transcriptText = parseTranscriptText(transcript.output_json);
    if (!transcriptText || transcriptText.length === 0) {
      return sendError(res, 400, "Transcript content is empty for this encounter");
    }

    const soapResult = await speechToSoap({
      encounter_id: encounterId,
      transcript: transcriptText,
    });

    const saved = await createAiResult({
      encounter_id: encounterId,
      flow_name: "soap_gemini",
      input_json: { transcript_id: transcript.id },
      output_json: soapResult,
      model_version: soapResult.model_version,
      confidence_score: soapResult.confidence,
    });

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
