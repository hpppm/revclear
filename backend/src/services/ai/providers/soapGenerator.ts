import { z } from "zod";
import { ai, defaultTextModel } from "../runtime";
import { buildSoapPrompt } from "../prompts";
import { appConfig } from "../../../config/appConfig";
import logger from "../../../utils/logger";

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

const normalizeSoapOutput = (raw: unknown): SoapOutput => {
  const rawObj =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const rawSoap =
    rawObj.soap && typeof rawObj.soap === "object"
      ? (rawObj.soap as Record<string, unknown>)
      : rawObj;

  return {
    soap: {
      subjective: safeString(rawSoap.subjective),
      objective: safeString(rawSoap.objective),
      assessment: safeString(rawSoap.assessment),
      plan: safeString(rawSoap.plan),
    },
    confidence: clampConfidence(rawObj.confidence),
    model_version: appConfig.ai.geminiModel,
  };
};

class GenkitSoapGenerator implements SoapGenerator {
  async generate(input: GenerateSoapInput): Promise<SoapOutput> {
    const result = await ai.generate({
      model: defaultTextModel,
      prompt: buildSoapPrompt(input.encounterId, input.transcriptText),
      output: { schema: SoapSchema },
      config: {
        temperature: 0.2,
      },
    });

    const output = normalizeSoapOutput(result.output ?? {});
    logger.info(
      { encounterId: input.encounterId, model: output.model_version },
      "soap generation completed",
    );
    return SoapSchema.parse(output);
  }
}

let soapGeneratorSingleton: SoapGenerator | null = null;

export const getSoapGenerator = (): SoapGenerator => {
  if (!soapGeneratorSingleton) {
    soapGeneratorSingleton = new GenkitSoapGenerator();
  }
  return soapGeneratorSingleton;
};
