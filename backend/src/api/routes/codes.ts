import { Router } from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { authMiddleware } from "../../middleware/auth";
import { IdParamSchema } from "../../types/zod";
import { sendError } from "../../utils/httpResponses";
import { soapToCodes } from "../../../genkit";
import { query } from "../../config/db";
import { getLatestAiResult } from "../../db/queries";

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
            isAiSuggested: z.boolean().optional(),
        })
    ),
});

const SearchQuerySchema = z.object({
    q: z.string().min(1, "Search query is required"),
    type: z.enum(["icd", "cpt"]),
});

// =========================================================
// HELPER FUNCTIONS
// =========================================================

const loadCodesFromFile = async (type: "icd" | "cpt") => {
    const filename = type === "icd" ? "mockIcdCodes.json" : "mockCptCodes.json";
    const filePath = path.resolve(process.cwd(), "genkit/data", filename);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
};

// =========================================================
// DATABASE QUERIES
// =========================================================

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
     RETURNING *`,
        [
            data.encounter_id,
            data.code_type,
            data.code,
            data.description,
            data.category,
            data.confidence_score ?? null,
            data.is_ai_suggested,
        ]
    );
    return result.rows[0];
};

const getMedicalCodesByEncounter = async (encounter_id: string) => {
    const result = await query(
        `SELECT * FROM medical_codes WHERE encounter_id = $1 ORDER BY created_at ASC`,
        [encounter_id]
    );
    return result.rows;
};

const deleteMedicalCodesByEncounter = async (encounter_id: string) => {
    await query(`DELETE FROM medical_codes WHERE encounter_id = $1`, [encounter_id]);
};

const getClaimByEncounter = async (encounter_id: string) => {
    const result = await query(
        `SELECT * FROM claims WHERE encounter_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [encounter_id]
    );
    return result.rows[0];
};

const createClaim = async (data: {
    encounter_id: string;
    clinician_id: string;
    patient_id: string;
    diagnosis_codes: string[];
    procedure_codes: string[];
    total_amount: number;
    insurance_provider: string;
    status: string;
}) => {
    const result = await query(
        `INSERT INTO claims (encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
        [
            data.encounter_id,
            data.clinician_id,
            data.patient_id,
            data.diagnosis_codes,
            data.procedure_codes,
            data.total_amount,
            data.insurance_provider,
            data.status,
        ]
    );
    return result.rows[0];
};

// =========================================================
// ROUTES
// =========================================================

/**
 * POST /api/encounters/:id/codes/match
 * Get AI-suggested code matches from SOAP note
 */
router.post("/:id/codes/match", authMiddleware, async (req, res) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
    }
    const encounterId = parsed.data.id;

    try {
        // Get SOAP note from database
        const soapResult = await getLatestAiResult(encounterId, "soap_gemini");
        if (!soapResult) {
            return sendError(res, 404, "No SOAP note found for this encounter");
        }

        // Extract SOAP text
        const soap = soapResult.output_json?.soap;
        if (!soap) {
            return sendError(res, 400, "Invalid SOAP note format");
        }

        const soapText = `Subjective: ${soap.subjective}\nObjective: ${soap.objective}\nAssessment: ${soap.assessment}\nPlan: ${soap.plan}`;

        console.log(`[POST /codes/match] Matching codes for encounter ${encounterId}`);

        // Call soapToCodes flow
        const matches = await soapToCodes({ soapNote: soapText });

        return res.json({
            success: true,
            data: {
                icdMatches: matches.icdMatches,
                cptMatches: matches.cptMatches,
            },
            metadata: {
                model_version: matches.model_version,
            },
        });
    } catch (error: any) {
        console.error("[POST /codes/match] error", error);
        return sendError(res, 500, error.message || "Failed to match codes");
    }
});

/**
 * GET /api/codes/search?q=<query>&type=<icd|cpt>
 * Manual search for codes
 */
router.get("/search", authMiddleware, async (req, res) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid search parameters", parsed.error.issues);
    }

    const { q, type } = parsed.data;

    try {
        const codes = await loadCodesFromFile(type);
        const searchLower = q.toLowerCase();

        const results = codes.filter(
            (code: any) =>
                code.code.toLowerCase().includes(searchLower) ||
                code.description.toLowerCase().includes(searchLower) ||
                code.category.toLowerCase().includes(searchLower)
        );

        return res.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        console.error("[GET /codes/search] error", error);
        return sendError(res, 500, "Failed to search codes");
    }
});

/**
 * POST /api/encounters/:id/codes
 * Save user-selected codes
 */
router.post("/:id/codes", authMiddleware, async (req, res) => {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        return sendError(res, 400, "Invalid encounter id", parsedParams.error.issues);
    }

    const parsedBody = SaveCodesSchema.safeParse(req.body);
    if (!parsedBody.success) {
        return sendError(res, 400, "Invalid codes payload", parsedBody.error.issues);
    }

    const encounterId = parsedParams.data.id;
    const { codes } = parsedBody.data;

    try {
        // Delete existing codes for this encounter
        await deleteMedicalCodesByEncounter(encounterId);

        // Save new codes
        const savedCodes = [];
        for (const code of codes) {
            const saved = await saveMedicalCode({
                encounter_id: encounterId,
                code_type: code.codeType,
                code: code.code,
                description: code.description,
                category: code.category,
                confidence_score: code.confidence,
                is_ai_suggested: code.isAiSuggested ?? false,
            });
            savedCodes.push(saved);
        }

        return res.status(201).json({
            success: true,
            data: savedCodes,
        });
    } catch (error: any) {
        console.error("[POST /codes] error", error);
        return sendError(res, 500, "Failed to save codes");
    }
});

/**
 * GET /api/encounters/:id/codes
 * Get saved codes for encounter
 */
router.get("/:id/codes", authMiddleware, async (req, res) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
    }
    const encounterId = parsed.data.id;

    try {
        const codes = await getMedicalCodesByEncounter(encounterId);

        if (codes.length === 0) {
            return sendError(res, 404, "No codes found for this encounter");
        }

        return res.json({
            success: true,
            data: codes,
        });
    } catch (error: any) {
        console.error("[GET /codes] error", error);
        return sendError(res, 500, "Failed to fetch codes");
    }
});

/**
 * POST /api/encounters/:id/claim
 * Generate insurance claim from selected codes
 */
router.post("/:id/claim", authMiddleware, async (req, res) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
    }
    const encounterId = parsed.data.id;

    try {
        // Get encounter details
        const encounterResult = await query(
            `SELECT * FROM encounters WHERE id = $1`,
            [encounterId]
        );
        if (encounterResult.rows.length === 0) {
            return sendError(res, 404, "Encounter not found");
        }
        const encounter = encounterResult.rows[0];

        // Get patient details
        const patientResult = await query(
            `SELECT * FROM patients WHERE id = $1`,
            [encounter.patient_id]
        );
        if (patientResult.rows.length === 0) {
            return sendError(res, 404, "Patient not found");
        }
        const patient = patientResult.rows[0];

        // Get selected codes
        const codes = await getMedicalCodesByEncounter(encounterId);
        if (codes.length === 0) {
            return sendError(res, 400, "No codes selected for this encounter");
        }

        const icdCodes = codes.filter((c) => c.code_type === "ICD").map((c) => c.code);
        const cptCodes = codes.filter((c) => c.code_type === "CPT").map((c) => c.code);

        // Mock pricing: $100 per CPT code
        const totalAmount = cptCodes.length * 100;

        // Create claim
        const claim = await createClaim({
            encounter_id: encounterId,
            clinician_id: encounter.clinician_id,
            patient_id: encounter.patient_id,
            diagnosis_codes: icdCodes,
            procedure_codes: cptCodes,
            total_amount: totalAmount,
            insurance_provider: patient.insurance_provider || "Unknown",
            status: "draft",
        });

        return res.status(201).json({
            success: true,
            data: claim,
        });
    } catch (error: any) {
        console.error("[POST /claim] error", error);
        return sendError(res, 500, "Failed to generate claim");
    }
});

/**
 * GET /api/encounters/:id/claim
 * Get claim for encounter
 */
router.get("/:id/claim", authMiddleware, async (req, res) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
    }
    const encounterId = parsed.data.id;

    try {
        const claim = await getClaimByEncounter(encounterId);

        if (!claim) {
            return sendError(res, 404, "No claim found for this encounter");
        }

        return res.json({
            success: true,
            data: claim,
        });
    } catch (error: any) {
        console.error("[GET /claim] error", error);
        return sendError(res, 500, "Failed to fetch claim");
    }
});

export default router;
