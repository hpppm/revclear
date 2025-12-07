import { z } from "genkit";
import { loadMedicalCodesTool } from "../tools/loadMedicalCodes";
import { ai } from "../config";


const CodeMatchSchema = z.object({
    code: z.string(),
    description: z.string(),
    category: z.string(),
    confidence: z.number().min(0).max(1),
});

const SoapToCodesOutputSchema = z.object({
    icdMatches: z.array(CodeMatchSchema).max(3),
    cptMatches: z.array(CodeMatchSchema).max(3),
    model_version: z.string(),
});

const SoapToCodesInputSchema = z.object({
    soapNote: z.string().min(1).describe("The SOAP note text to match against medical codes"),
});

export const soapToCodes = ai.defineFlow(
    {
        name: "soapToCodes",
        inputSchema: SoapToCodesInputSchema,
        outputSchema: SoapToCodesOutputSchema,
    },
    async (input: z.infer<typeof SoapToCodesInputSchema>) => {
        console.log(`[soapToCodes] Analyzing SOAP note (length: ${input.soapNote.length})`);

        // Load available medical codes (cached in-memory)
        const { icdCodes, cptCodes } = await loadMedicalCodesTool({});

        // Create formatted lists for the AI prompt
        const icdList = icdCodes
            .map((c) => `${c.code}: ${c.description} (${c.category})`)
            .join("\n");
        const cptList = cptCodes
            .map((c) => `${c.code}: ${c.description} (${c.category})`)
            .join("\n");

        const prompt = `You are a medical coding expert. Match the SOAP note to the most relevant ICD-10 diagnosis codes and CPT procedure codes ONLY from the lists provided.

SOAP NOTE:
${input.soapNote}

AVAILABLE ICD-10 CODES (Diagnosis):
${icdList}

AVAILABLE CPT CODES (Procedures):
${cptList}

INSTRUCTIONS:
1) Return up to 3 ICD-10 and up to 3 CPT codes that best match the SOAP content.
2) For each match, include a confidence score (0-1) based on fit.
3) Only return codes from the provided lists. Do not invent codes.
4) Order matches by confidence (highest first).
Return JSON matching the schema.`;

        const { output } = await ai.generate({
            model: ai.options.model,
            prompt,
            output: { schema: SoapToCodesOutputSchema },
        });

        const result = output ?? {
            icdMatches: [],
            cptMatches: [],
            model_version: ai.options.model || "unknown",
        };

        // Validate that returned codes exist in our databases and clamp confidence to [0,1]
        const validIcdCodes = new Set(icdCodes.map((c) => c.code));
        const validCptCodes = new Set(cptCodes.map((c) => c.code));

        const normalizeMatches = (matches: z.infer<typeof SoapToCodesOutputSchema>["icdMatches"], valid: Set<string>) =>
            (matches || [])
                .filter((m) => valid.has(m.code))
                .map((m) => ({
                    ...m,
                    confidence: Math.max(0, Math.min(1, Number(m.confidence))),
                }))
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3);

        const validatedIcd = normalizeMatches(result.icdMatches, validIcdCodes);
        const validatedCpt = normalizeMatches(result.cptMatches, validCptCodes);

        console.log(
            `[soapToCodes] Validated: ${validatedIcd.length} ICD, ${validatedCpt.length} CPT`
        );

        return {
            icdMatches: validatedIcd,
            cptMatches: validatedCpt,
            model_version: typeof result.model_version === "string" ? result.model_version : (ai.options.model as string) || "unknown",
        };
    }
);
