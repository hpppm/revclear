import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { requireCapability } from "../../middleware/authorization";
import { requireAiQuota } from "../../middleware/aiQuota";
import { IdParamSchema } from "../../types/zod";
import { sendError } from "../../utils/httpResponses";
import { soapToCodes } from "../../services/ai/soapToCodes";
import { getFlatCptCodes } from "../../data/ai/cptDataLoader";
import { query } from "../../config/db";
import { getLatestAiResultByFlowNames, createAiResult } from "../../db/queries";
import { getAuthenticatedUser } from "../../utils/auth";
import { getUserOrganization } from "../../utils/organization";
import { SOAP_READ_FLOW_NAMES, AI_FLOW_NAMES } from "../../constants/aiFlows";
import logger from "../../utils/logger";

// =========================================================
// ASYNC JOB STATE
// =========================================================

type JobStatus = "pending" | "done" | "error";

interface CodeMatchJob {
  status: JobStatus;
  result?: { icdMatches: unknown[]; cptMatches: unknown[]; model_version: string; pineconeDegraded?: boolean };
  error?: string;
  createdAt: number;
}

const codeMatchJobs = new Map<string, CodeMatchJob>();

const JOB_TTL_MS = 10 * 60 * 1000; // 10 minutes

const pruneExpiredJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of codeMatchJobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      codeMatchJobs.delete(jobId);
    }
  }
};

const router = Router();

// =========================================================
// ZOD SCHEMAS
// =========================================================

const CodeMatchSchema = z.object({
  code: z.string(),
  description: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(1),
  isAiSuggested: z.boolean().optional(),
});

const SaveCodesSchema = z.object({
  codes: z.array(
    z.object({
      code: z.string(),
      codeType: z.enum(["ICD", "CPT"]),
      description: z.string(),
      category: z.string(),
      confidence: z.number().min(0).max(1).optional(),
      confidence_score: z.number().min(0).max(1).optional(),
      isAiSuggested: z.boolean().optional(),
    }),
  ),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  type: z.enum(["icd", "cpt"]),
});

// =========================================================
// HELPER FUNCTIONS
// =========================================================


// =========================================================
// DATABASE QUERIES
// =========================================================

// Explicit column list for data minimization
const MEDICAL_CODE_COLUMNS = `id, encounter_id, code_type, code, description, category, confidence_score, is_ai_suggested, created_at`;

const saveMedicalCode = async (data: {
  encounter_id: string;
  code_type: string;
  code: string;
  description: string;
  category: string;
  confidence_score?: number;
  is_ai_suggested: boolean;
}) => {
  const result = await query(
    `INSERT INTO medical_codes (encounter_id, code_type, code, description, category, confidence_score, is_ai_suggested)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${MEDICAL_CODE_COLUMNS}`,
    [
      data.encounter_id,
      data.code_type,
      data.code,
      data.description,
      data.category,
      data.confidence_score ?? null,
      data.is_ai_suggested,
    ],
  );
  return result.rows[0];
};

const getMedicalCodesByEncounter = async (encounter_id: string) => {
  const result = await query(
    `SELECT ${MEDICAL_CODE_COLUMNS} FROM medical_codes WHERE encounter_id = $1 ORDER BY created_at ASC`,
    [encounter_id],
  );
  return result.rows;
};

const deleteMedicalCodesByEncounter = async (encounter_id: string) => {
  await query(`DELETE FROM medical_codes WHERE encounter_id = $1`, [
    encounter_id,
  ]);
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

const requireOwnedEncounter = async (
  encounterId: string,
  clinicianId: string,
  organizationId?: string,
) => {
  const result = await query(
    `SELECT id, patient_id, clinician_id, organization_id, status, soap_result_id
         FROM encounters WHERE id = $1 AND clinician_id = $2 AND organization_id = $3`,
    [encounterId, clinicianId, organizationId || null],
  );
  return result.rows[0] || null;
};

// =========================================================
// ROUTES
// =========================================================

/**
 * POST /api/encounters/:id/codes/match
 * Start AI code matching as a background job; returns 202 with jobId.
 * Poll GET /:id/codes/match/status/:jobId for results.
 */
router.post("/:id/codes/match", authMiddleware, requireCapability("use_clinical_ai"), requireAiQuota("codes"), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const organizationId = await getRequestOrganizationId(user.id);

  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  const encounter = await requireOwnedEncounter(encounterId, user.id, organizationId);
  if (!encounter) {
    return sendError(res, 404, "Encounter not found");
  }

  // Validate SOAP note availability before starting the background job
  let soapText: string;
  try {
    const soapResult = await getLatestAiResultByFlowNames(encounterId, SOAP_READ_FLOW_NAMES);
    if (!soapResult) {
      return sendError(res, 404, "No SOAP note found for this encounter");
    }

    const soap = soapResult.output_json?.soap;
    if (!soap) {
      return sendError(res, 400, "Invalid SOAP note format");
    }

    const soapParts: string[] = [];
    if (soap.subjective?.trim()) soapParts.push(`Subjective: ${soap.subjective.trim()}`);
    if (soap.objective?.trim()) soapParts.push(`Objective: ${soap.objective.trim()}`);
    if (soap.assessment?.trim()) soapParts.push(`Assessment: ${soap.assessment.trim()}`);
    if (soap.plan?.trim()) soapParts.push(`Plan: ${soap.plan.trim()}`);

    if (soapParts.length === 0) {
      return sendError(res, 400, "SOAP note has no content to generate codes from");
    }

    soapText = soapParts.join("\n");
  } catch (error: any) {
    logger.error({ err: error }, "codes/match: error reading SOAP note");
    return sendError(res, 500, "Failed to read SOAP note");
  }

  const jobId = randomUUID();
  codeMatchJobs.set(jobId, { status: "pending", createdAt: Date.now() });

  logger.info({ encounterId, jobId }, "codes/match: starting background job");

  // Fire and forget — do not await
  void (async () => {
    try {
      const matches = await soapToCodes({ soapNote: soapText });

      void createAiResult({
        encounter_id: encounterId,
        flow_name: AI_FLOW_NAMES.codeMatch,
        input_json: { soapLength: soapText.length },
        output_json: { icdMatches: matches.icdMatches, cptMatches: matches.cptMatches },
        model_version: matches.model_version,
      }).catch((err) => logger.warn({ err }, "codes/match: failed to persist ai_result"));

      codeMatchJobs.set(jobId, {
        status: "done",
        result: {
          icdMatches: matches.icdMatches,
          cptMatches: matches.cptMatches,
          model_version: matches.model_version,
          pineconeDegraded: (matches as any).pineconeDegraded ?? false,
        },
        createdAt: Date.now(),
      });

      logger.info({ encounterId, jobId }, "codes/match: background job completed");
    } catch (error: any) {
      logger.error({ err: error, jobId, encounterId }, "codes/match: background job failed");
      let errorMessage = "Failed to match codes";
      if (error?.message?.includes("Both Gemini and Groq failed")) {
        errorMessage = "AI services temporarily unavailable. Please try again in a moment.";
      } else if (error?.message?.includes("timed out after 25 seconds")) {
        errorMessage = "AI code matching timed out. Please try again.";
      }
      codeMatchJobs.set(jobId, {
        status: "error",
        error: errorMessage,
        createdAt: Date.now(),
      });
    }
  })();

  return res.status(202).json({ success: true, data: { jobId, status: "pending" } });
});

/**
 * GET /api/encounters/:id/codes/match/status/:jobId
 * Poll for the result of a background code matching job.
 */
router.get("/:id/codes/match/status/:jobId", authMiddleware, requireCapability("use_clinical_ai"), async (req, res) => {
  pruneExpiredJobs();

  const jobId = req.params.jobId;
  const job = codeMatchJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (job.status === "pending") {
    return res.json({ success: true, data: { status: "pending" } });
  }

  if (job.status === "done") {
    return res.json({ success: true, data: { status: "done", result: job.result } });
  }

  // status === "error"
  return res.status(200).json({ success: false, error: "Job failed", data: { status: "error" } });
});

/**
 * GET /api/codes/search?q=<query>&type=<icd|cpt>
 * Manual search for codes
 */
router.get("/search", authMiddleware, requireCapability("use_clinical_ai"), async (req, res) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid search parameters",
      parsed.error.issues,
    );
  }

  const { q, type } = parsed.data;

  try {
    if (type === "icd") {
      return sendError(res, 501, "ICD-10 code search is not yet available");
    }

    const codes = getFlatCptCodes();
    const searchLower = q.toLowerCase();

    const results = codes
      .filter(
        (entry) =>
          entry.code.toLowerCase().includes(searchLower) ||
          entry.short_description.toLowerCase().includes(searchLower) ||
          entry.clinical.type.toLowerCase().includes(searchLower),
      )
      .map((entry) => ({
        code: entry.code,
        description: entry.short_description,
        category: entry.clinical.type,
      }));

    return res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'GET codes/search: error');
    return sendError(res, 500, "Failed to search codes");
  }
});

/**
 * POST /api/encounters/:id/codes
 * Save user-selected codes
 */
router.post("/:id/codes", authMiddleware, requireCapability("use_clinical_ai"), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const organizationId = await getRequestOrganizationId(user.id);

  const parsedParams = IdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(
      res,
      400,
      "Invalid encounter id",
      parsedParams.error.issues,
    );
  }

  const parsedBody = SaveCodesSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(
      res,
      400,
      "Invalid codes payload",
      parsedBody.error.issues,
    );
  }

  const encounterId = parsedParams.data.id;
  const { codes } = parsedBody.data;

  const encounter = await requireOwnedEncounter(encounterId, user.id, organizationId);
  if (!encounter) {
    return sendError(res, 404, "Encounter not found");
  }

  try {
    // Delete existing codes for this encounter
    await deleteMedicalCodesByEncounter(encounterId);

    // Save new codes
    const savedCodes = [];
    for (const code of codes) {
      const confidence = code.confidence ?? code.confidence_score ?? undefined;
      const saved = await saveMedicalCode({
        encounter_id: encounterId,
        code_type: code.codeType,
        code: code.code,
        description: code.description,
        category: code.category,
        confidence_score: confidence,
        is_ai_suggested:
          code.isAiSuggested ?? (confidence !== undefined ? true : false),
      });
      savedCodes.push(saved);
    }

    return res.status(201).json({
      success: true,
      data: savedCodes,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'POST codes: error');
    return sendError(res, 500, "Failed to save codes");
  }
});

/**
 * GET /api/encounters/:id/codes
 * Get saved codes for encounter
 */
router.get("/:id/codes", authMiddleware, requireCapability("use_clinical_ai"), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const organizationId = await getRequestOrganizationId(user.id);

  const parsed = IdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
  }
  const encounterId = parsed.data.id;

  const encounter = await requireOwnedEncounter(encounterId, user.id, organizationId);
  if (!encounter) {
    return sendError(res, 404, "Encounter not found");
  }

  try {
    const codes = await getMedicalCodesByEncounter(encounterId);

    return res.json({
      success: true,
      data: codes,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'GET codes: error');
    return sendError(res, 500, "Failed to fetch codes");
  }
});

export default router;
