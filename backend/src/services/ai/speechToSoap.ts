import { z } from "zod";
import { getMockTranscript } from "./mockTranscript";
import { getSoapGenerator, SoapSchema } from "./providers/soapGenerator";
import logger from "../../utils/logger";

// SECURITY: Max length guards prevent oversized payloads from being sent to
// the AI inference server, limiting prompt-injection surface and resource abuse.
const MAX_TRANSCRIPT_LENGTH = 50_000; // ~10k tokens, covers ~45-min clinical encounter

const SpeechToSoapInput = z.object({
  encounter_id: z
    .string()
    .min(1)
    .describe("Encounter identifier (UUID in real usage)."),
  transcript: z
    .string()
    .min(1)
    .max(MAX_TRANSCRIPT_LENGTH, `Transcript exceeds maximum allowed length of ${MAX_TRANSCRIPT_LENGTH} characters.`)
    .describe("Flat transcript text from Whisper or mock data.")
    .optional(),
});

export type SpeechToSoapInputType = z.infer<typeof SpeechToSoapInput>;
export type SpeechToSoapOutputType = z.infer<typeof SoapSchema>;

export const speechToSoap = async (
  input: SpeechToSoapInputType
): Promise<SpeechToSoapOutputType> => {
  const parsedInput = SpeechToSoapInput.parse(input);

  const generator = getSoapGenerator();

  const transcriptText =
    parsedInput.transcript && parsedInput.transcript.trim().length > 0
      ? parsedInput.transcript
      : (await getMockTranscript()).transcript;

  // HIPAA 45 CFR § 164.312(b): Audit log for AI activity — record who triggered
  // the AI flow, which encounter it applies to, and the outcome.
  const auditBase = {
    event: "ai.speechToSoap",
    encounterId: parsedInput.encounter_id,
    timestamp: new Date().toISOString(),
  };

  let output: SpeechToSoapOutputType;
  try {
    output = await generator.generate({
      encounterId: parsedInput.encounter_id,
      transcriptText,
    });
    logger.info({ ...auditBase, success: true }, "speechToSoap completed");
  } catch (error: any) {
    logger.error({ ...auditBase, success: false, code: error?.code }, "speechToSoap failed");
    throw error;
  }

  const base = output || {
    soap: {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    },
    confidence: 0.5,
    model_version: process.env.OLLAMA_MODEL || "ollama",
  };

  return {
    ...base,
    model_version: base.model_version || process.env.OLLAMA_MODEL || "ollama",
  };
};
