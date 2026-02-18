import { z } from "zod";
import { getCodeMatcher, SoapToCodesOutputSchema } from "./providers/codeMatcher";
import logger from "../../utils/logger";

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

  const codeMatcher = getCodeMatcher();
  const result = await codeMatcher.match({ soapNote: parsedInput.soapNote });

  const normalizeMatches = (
    matches: z.infer<typeof SoapToCodesOutputSchema>["icdMatches"]
  ) =>
    (matches || [])
      .map((m) => ({
        ...m,
        confidence: Math.max(0, Math.min(1, Number(m.confidence))),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

  const validatedIcd = normalizeMatches(result.icdMatches);
  const validatedCpt = normalizeMatches(result.cptMatches);

  logger.info({ icdCount: validatedIcd.length, cptCount: validatedCpt.length }, 'soapToCodes completed');

  return {
    icdMatches: validatedIcd,
    cptMatches: validatedCpt,
    model_version:
      typeof result.model_version === "string"
        ? result.model_version
        : process.env.OLLAMA_CODES_MODEL || process.env.OLLAMA_MODEL || "unknown",
  };
};
