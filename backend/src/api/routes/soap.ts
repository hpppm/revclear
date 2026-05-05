import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { requireCapability } from "../../middleware/authorization";
import { requireAiQuota } from "../../middleware/aiQuota";
import { IdParamSchema } from "../../types/zod";
import { createAiResult, getLatestAiResult, getLatestAiResultByFlowNames } from "../../db/queries";
import { sendError } from "../../utils/httpResponses";
import { speechToSoap } from "../../services/ai/speechToSoap";
import { query } from "../../config/db";
import { getAuthenticatedUser } from "../../utils/auth";
import { getUserOrganization } from "../../utils/organization";
import { AI_FLOW_NAMES, SOAP_READ_FLOW_NAMES } from "../../constants/aiFlows";
import logger from "../../utils/logger";

const router = Router();

const SoapPayloadSchema = z.object({
  soap: z.object({
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
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

const requireUser = async (req: any, res: any) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "User not authenticated" });
    return null;
  }
  return user;
};

const getRequestOrganizationId = async (userId: string) => {
  const organization = await getUserOrganization(userId);
  return organization?.id;
};

// SECURITY: Require BOTH clinician_id AND organization_id — prevents cross-clinician
// access within the same organization. Using OR would allow any clinician in the
// org to access another clinician's PHI data.
const ensureEncounterOwnership = async (encounterId: string, clinicianId: string, organizationId?: string) => {
  const result = await query(
    "SELECT id FROM encounters WHERE id = $1 AND clinician_id = $2 AND organization_id = $3",
    [encounterId, clinicianId, organizationId || null]
  );
  return result.rows.length > 0;
};

router.get("/:id/soap", authMiddleware, requireCapability("use_clinical_ai"), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const organizationId = await getRequestOrganizationId(user.id);

  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  const ownsEncounter = await ensureEncounterOwnership(encounterId, user.id, organizationId);
  if (!ownsEncounter) {
    return sendError(res, 404, "Encounter not found");
  }

  try {
    const latest = await getLatestAiResultByFlowNames(encounterId, SOAP_READ_FLOW_NAMES);
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
    logger.error({ encounterId, err: error }, 'GET soap: error');
    return sendError(res, 500, "Failed to fetch SOAP note");
  }
});

router.post("/:id/soap", authMiddleware, requireCapability("use_clinical_ai"), requireAiQuota("soap"), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const organizationId = await getRequestOrganizationId(user.id);

  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  const ownsEncounter = await ensureEncounterOwnership(encounterId, user.id, organizationId);
  if (!ownsEncounter) {
    return sendError(res, 404, "Encounter not found");
  }

  try {
    // Try to get transcript from database
    const transcriptResult = await getLatestAiResult(encounterId, AI_FLOW_NAMES.transcript);

    if (!transcriptResult) {
      return sendError(res, 404, "No transcript found for encounter");
    }

    const transcriptText = parseTranscriptText(transcriptResult.output_json) || "";
    logger.debug({ encounterId, length: transcriptText.length }, 'soap: transcript found in DB');

    if (!transcriptText.trim()) {
      return sendError(res, 404, "No transcript found for encounter");
    }

    const soapResult = await speechToSoap({
      encounter_id: encounterId,
      transcript: transcriptText,
    });

    // SECURITY: Do not log SOAP results - they contain PHI (clinical diagnoses, treatment plans)

    const saved = await createAiResult({
      encounter_id: encounterId,
      flow_name: AI_FLOW_NAMES.soapNote,
      input_json: { transcript_id: transcriptResult.id },
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
    logger.error({ encounterId, err: error }, 'POST soap: error');
    return sendError(res, 500, "Failed to generate SOAP note");
  }
});

router.put("/:id/soap", authMiddleware, requireCapability("use_clinical_ai"), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const organizationId = await getRequestOrganizationId(user.id);

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

  const ownsEncounter = await ensureEncounterOwnership(encounterId, user.id, organizationId);
  if (!ownsEncounter) {
    return sendError(res, 404, "Encounter not found");
  }

  try {
    const saved = await createAiResult({
      encounter_id: encounterId,
      flow_name: AI_FLOW_NAMES.soapNote,
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
    logger.error({ encounterId, err: error }, 'PUT soap: error');
    return sendError(res, 500, "Failed to save SOAP note");
  }
});

export default router;
