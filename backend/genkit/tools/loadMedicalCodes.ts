import fs from "fs/promises";
import path from "path";
import { z } from "genkit";
import { ai } from "../config";

export type MedicalCode = {
    code: string;
    description: string;
    category: string;
};

export type MedicalCodesData = {
    icdCodes: MedicalCode[];
    cptCodes: MedicalCode[];
};

const icdPath = path.resolve(process.cwd(), "genkit/data/mockIcdCodes.json");
const cptPath = path.resolve(process.cwd(), "genkit/data/mockCptCodes.json");

export const loadMedicalCodesTool = ai.defineTool(
    {
        name: "loadMedicalCodes",
        description: "Loads ICD-10 and CPT medical codes from JSON databases for matching against SOAP notes.",
        inputSchema: z.object({}).optional(),
        outputSchema: z.object({
            icdCodes: z.array(
                z.object({
                    code: z.string(),
                    description: z.string(),
                    category: z.string(),
                })
            ),
            cptCodes: z.array(
                z.object({
                    code: z.string(),
                    description: z.string(),
                    category: z.string(),
                })
            ),
        }),
    },
    async () => {
        const [icdRaw, cptRaw] = await Promise.all([
            fs.readFile(icdPath, "utf-8"),
            fs.readFile(cptPath, "utf-8"),
        ]);

        const icdCodes: MedicalCode[] = JSON.parse(icdRaw);
        const cptCodes: MedicalCode[] = JSON.parse(cptRaw);

        return {
            icdCodes,
            cptCodes,
        };
    }
);
