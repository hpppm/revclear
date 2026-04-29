import { z } from "zod";
import { ai, defaultTextModel } from "../runtime";
import { buildSoapPrompt } from "../prompts";
import { appConfig } from "../../../config/appConfig";
import logger from "../../../utils/logger";
import { scrubPHI } from "../../../utils/textScrubber";
import { callGroqForJson } from "./groqFallback";

export const SoapSchema = z.object({
  soap: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  confidence: z.number().min(0).max(1),
  model_version: z.string(),
});

type SoapOutput = z.infer<typeof SoapSchema>;

type GenerateSoapInput = {
  encounterId: string;
  transcriptText: string;
};

type SoapGenerator = {
  generate(input: GenerateSoapInput): Promise<SoapOutput>;
};

const safeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const clampConfidence = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
};

const normalizeSoapOutput = (raw: unknown, encounterId: string): SoapOutput => {
  const rawObj =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const rawSoap =
    rawObj.soap && typeof rawObj.soap === "object"
      ? (rawObj.soap as Record<string, unknown>)
      : {};

  const sections = {
    subjective: safeString(rawSoap.subjective),
    objective: safeString(rawSoap.objective),
    assessment: safeString(rawSoap.assessment),
    plan: safeString(rawSoap.plan),
  };

  const blanks = (Object.keys(sections) as Array<keyof typeof sections>).filter(
    (k) => !sections[k],
  );
  if (blanks.length > 0) {
    logger.warn({ encounterId, blanks }, "soap-generator: LLM returned blank SOAP sections");
  }

  return {
    soap: sections,
    confidence: clampConfidence(rawObj.confidence),
    model_version: safeString(rawObj.model_version) || appConfig.ai.geminiModel,
  };
};

class GenkitSoapGenerator implements SoapGenerator {
  async generate(input: GenerateSoapInput): Promise<SoapOutput> {
    // SECURITY: Scrub structured PHI patterns before the transcript leaves the
    // server. Free-text names cannot be redacted without NLP — a BAA with the
    // external AI provider is still required for full HIPAA compliance.
    const { scrubbed: scrubbedTranscript, redactionCount } = scrubPHI(input.transcriptText);
    if (redactionCount > 0) {
      logger.info(
        { encounterId: input.encounterId, redactionCount },
        "soap-generator: PHI redacted before AI call",
      );
    }

    const prompt = buildSoapPrompt(scrubbedTranscript);

    let rawOutput: unknown;
    let providerUsed: "gemini" | "groq" = "gemini";

    try {
      const result = await ai.generate({
        model: defaultTextModel,
        prompt,
        output: { schema: SoapSchema },
        config: { temperature: 0.2 },
      });
      rawOutput = result.output ?? {};
    } catch (geminiError) {
      logger.warn(
        {
          encounterId: input.encounterId,
          provider: "gemini",
          err: (geminiError as Error)?.message,
        },
        "soap-generator: gemini failed, attempting groq fallback",
      );
      rawOutput = await callGroqForJson(prompt, {
        operation: "soap",
        encounterId: input.encounterId,
      });
      providerUsed = "groq";
    }

    const output = normalizeSoapOutput(rawOutput, input.encounterId);
    logger.info(
      { encounterId: input.encounterId, model: output.model_version, provider: providerUsed },
      "soap generation completed",
    );
    // safeParse so a malformed LLM response never crashes the route
    const parseResult = SoapSchema.safeParse(output);
    return parseResult.success ? parseResult.data : output;
  }
}

let soapGeneratorSingleton: SoapGenerator | null = null;

export const getSoapGenerator = (): SoapGenerator => {
  if (!soapGeneratorSingleton) {
    soapGeneratorSingleton = new GenkitSoapGenerator();
  }
  return soapGeneratorSingleton;
};
