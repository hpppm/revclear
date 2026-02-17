import { z } from "zod";
import { loadMedicalCodes } from "./loadMedicalCodes";
import { getCodeMatcher, SoapToCodesOutputSchema } from "./providers/codeMatcher";

const SoapToCodesInputSchema = z.object({
  soapNote: z
    .string()
    .min(1)
    .describe("The SOAP note text to match against medical codes"),
});

export type SoapToCodesInputType = z.infer<typeof SoapToCodesInputSchema>;
export type SoapToCodesOutputType = z.infer<typeof SoapToCodesOutputSchema>;

export const soapToCodes = async (
  input: SoapToCodesInputType
): Promise<SoapToCodesOutputType> => {
  const parsedInput = SoapToCodesInputSchema.parse(input);
  console.log(
    `[soapToCodes] Analyzing SOAP note (length: ${parsedInput.soapNote.length})`
  );

  const codeMatcher = getCodeMatcher();
  const { icdCodes, cptCodes } = await loadMedicalCodes();

  const icdList = icdCodes
    .map((c) => `${c.code}: ${c.description} (${c.category})`)
    .join("\n");
  const cptList = cptCodes
    .map((c) => `${c.code}: ${c.description} (${c.category})`)
    .join("\n");

  const output = await codeMatcher.match({
    soapNote: parsedInput.soapNote,
    icdListText: icdList,
    cptListText: cptList,
  });

  const result = output ?? {
    icdMatches: [],
    cptMatches: [],
    model_version:
      process.env.OLLAMA_CODES_MODEL || process.env.OLLAMA_MODEL || "unknown",
  };

  const validIcdCodes = new Set(icdCodes.map((c) => c.code));
  const validCptCodes = new Set(cptCodes.map((c) => c.code));

  const normalizeMatches = (
    matches: z.infer<typeof SoapToCodesOutputSchema>["icdMatches"],
    valid: Set<string>
  ) =>
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
    model_version:
      typeof result.model_version === "string"
        ? result.model_version
        : process.env.OLLAMA_CODES_MODEL || process.env.OLLAMA_MODEL || "unknown",
  };
};
