import { z } from "genkit";
import { ai } from "../config";
import { loadMedicalCodesTool } from "../tools/loadMedicalCodes";


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
    async (input) => {
        console.log(`[soapToCodes] Analyzing SOAP note (length: ${input.soapNote.length})`);

        // Load available medical codes
        const { icdCodes, cptCodes } = await loadMedicalCodesTool({});

        console.log(`[soapToCodes] Loaded ${icdCodes.length} ICD codes and ${cptCodes.length} CPT codes`);

        // Create formatted lists for the AI prompt
        const icdList = icdCodes
            .map((c) => `${c.code}: ${c.description} (${c.category})`)
            .join("\n");
        const cptList = cptCodes
            .map((c) => `${c.code}: ${c.description} (${c.category})`)
            .join("\n");

        const prompt = `You are a medical coding expert. Your task is to match a SOAP note to the most relevant ICD-10 diagnosis codes and CPT procedure codes from the available databases.

SOAP NOTE:
${input.soapNote}

AVAILABLE ICD-10 CODES (Diagnosis):
${icdList}

AVAILABLE CPT CODES (Procedures):
${cptList}

INSTRUCTIONS:
1. Analyze the SOAP note carefully
2. Match the content to the TOP 3 most relevant ICD-10 codes from the list above
3. Match the content to the TOP 3 most relevant CPT codes from the list above
4. For each match, provide a confidence score (0-1) based on how well it matches the SOAP content
5. ONLY return codes that exist in the lists above - do not invent new codes
6. Order matches by confidence (highest first)
7. You need to return at least 3 matches for each code type (ICD and CPT)

Return your matches in the specified JSON format.`;

        const { output } = await ai.generate({
            model: ai.options.model,
            prompt,
            output: { schema: SoapToCodesOutputSchema },
        });

        console.log(`[soapToCodes] Generated matches:`, JSON.stringify(output, null, 2));

        const result = output ?? {
            icdMatches: [],
            cptMatches: [],
            model_version: "gemini-2.5-flash",
        };

        // Validate that returned codes exist in our databases
        const validIcdCodes = new Set(icdCodes.map((c) => c.code));
        const validCptCodes = new Set(cptCodes.map((c) => c.code));

        const validatedIcdMatches = result.icdMatches.filter((match) =>
            validIcdCodes.has(match.code)
        );
        const validatedCptMatches = result.cptMatches.filter((match) =>
            validCptCodes.has(match.code)
        );

        console.log(
            `[soapToCodes] Validated: ${validatedIcdMatches.length} ICD, ${validatedCptMatches.length} CPT`
        );

        return {
            icdMatches: validatedIcdMatches,
            cptMatches: validatedCptMatches,
            model_version: result.model_version || "gemini-2.5-flash",
        };
    }
);
