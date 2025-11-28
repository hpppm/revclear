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
import { getAuthenticatedUser } from "../../utils/auth";

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

const requireUser = async (req: any, res: any) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        res.status(401).json({ success: false, message: "User not authenticated" });
        return null;
    }
    return user;
};

const requireOwnedEncounter = async (encounterId: string, clinicianId: string) => {
    const result = await query(`SELECT * FROM encounters WHERE id = $1 AND clinician_id = $2`, [encounterId, clinicianId]);
    return result.rows[0] || null;
};

// =========================================================
// ROUTES
// =========================================================

/**
 * POST /api/encounters/:id/codes/match
 * Get AI-suggested code matches from SOAP note
 */
router.post("/:id/codes/match", authMiddleware, async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
    }
    const encounterId = parsed.data.id;

    const encounter = await requireOwnedEncounter(encounterId, user.id);
    if (!encounter) {
        return sendError(res, 404, "Encounter not found");
    }

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
    const user = await requireUser(req, res);
    if (!user) return;

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

    const encounter = await requireOwnedEncounter(encounterId, user.id);
    if (!encounter) {
        return sendError(res, 404, "Encounter not found");
    }

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
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
        return sendError(res, 400, "Invalid encounter id", parsed.error.issues);
    }
    const encounterId = parsed.data.id;

    const encounter = await requireOwnedEncounter(encounterId, user.id);
    if (!encounter) {
        return sendError(res, 404, "Encounter not found");
    }

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

export default router;
