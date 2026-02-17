import { z } from "zod";
import { getMockTranscript } from "./mockTranscript";
import { getSoapGenerator, SoapSchema } from "./providers/soapGenerator";

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
  console.log(
    `[speechToSoap] Input transcript length: ${parsedInput.transcript?.length || 0}`
  );

  const generator = getSoapGenerator();

  const transcriptText =
    parsedInput.transcript && parsedInput.transcript.trim().length > 0
      ? parsedInput.transcript
      : (await getMockTranscript()).transcript;

  console.log(
    `[speechToSoap] Processing transcript (length: ${transcriptText.length} chars)`
  );

  const output = await generator.generate({
    encounterId: parsedInput.encounter_id,
    transcriptText,
  });

  console.log(
    `[speechToSoap] Generated SOAP note for encounter ${parsedInput.encounter_id} (${output?.soap ? "success" : "empty"})`
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
