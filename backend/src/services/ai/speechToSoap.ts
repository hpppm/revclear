import { z } from "zod";
import { getMockTranscript } from "./mockTranscript";
import { getSoapGenerator, SoapSchema } from "./providers/soapGenerator";
import logger from "../../utils/logger";

const SpeechToSoapInput = z.object({
  encounter_id: z
    .string()
    .min(1)
    .describe("Encounter identifier (UUID in real usage)."),
  transcript: z
    .string()
    .min(1)
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

  const output = await generator.generate({
    encounterId: parsedInput.encounter_id,
    transcriptText,
  });

  logger.info(
    { encounterId: parsedInput.encounter_id, success: !!output?.soap },
    'speechToSoap completed',
  );

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
