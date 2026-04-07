import { z } from "zod";
import { getCodeMatcher, SoapToCodesOutputSchema } from "./providers/codeMatcher";
import logger from "../../utils/logger";

// SECURITY: Max length guard prevents oversized SOAP notes from being forwarded
// to the AI inference server, limiting prompt-injection surface and resource abuse.
const MAX_SOAP_NOTE_LENGTH = 20_000; // well above any real SOAP note; ~4k tokens

const SoapToCodesInputSchema = z.object({
  soapNote: z
    .string()
    .min(1)
    .max(MAX_SOAP_NOTE_LENGTH, `SOAP note exceeds maximum allowed length of ${MAX_SOAP_NOTE_LENGTH} characters.`)
    .describe("The SOAP note text to match against medical codes"),
});

export type SoapToCodesInputType = z.infer<typeof SoapToCodesInputSchema>;
export type SoapToCodesOutputType = z.infer<typeof SoapToCodesOutputSchema>;

export const soapToCodes = async (
  input: SoapToCodesInputType
): Promise<SoapToCodesOutputType> => {
  const parsedInput = SoapToCodesInputSchema.parse(input);

  const codeMatcher = getCodeMatcher();

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

  // HIPAA 45 CFR § 164.312(b): Audit log for AI activity — record the code
  // matching event and its outcome without including PHI (no SOAP text).
  const auditBase = {
    event: "ai.soapToCodes",
    timestamp: new Date().toISOString(),
  };

  let result: SoapToCodesOutputType;
  try {
    result = await codeMatcher.match({ soapNote: parsedInput.soapNote });
    const validatedIcd = normalizeMatches(result.icdMatches);
    const validatedCpt = normalizeMatches(result.cptMatches);

    logger.info(
      { ...auditBase, success: true, icdCount: validatedIcd.length, cptCount: validatedCpt.length },
      "soapToCodes completed",
    );

    return {
      icdMatches: validatedIcd,
      cptMatches: validatedCpt,
      model_version:
        typeof result.model_version === "string"
          ? result.model_version
          : process.env.OLLAMA_CODES_MODEL || process.env.OLLAMA_MODEL || "unknown",
    };
  } catch (error: any) {
    logger.error({ ...auditBase, success: false, code: error?.code }, "soapToCodes failed");
    throw error;
  }
};
