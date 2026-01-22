import { z } from "genkit";
import { ai } from "../config";
import { mockTranscriptTool } from "../tools/mockTranscript";

const SoapSchema = z.object({
  soap: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  confidence: z.number().min(0).max(1),
  model_version: z.string(),
});

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

export const speechToSoap = ai.defineFlow(
  {
    name: "speechToSoap",
    inputSchema: SpeechToSoapInput,
    outputSchema: SoapSchema,
  },
  async (input) => {
    console.log(`[speechToSoap] Input transcript length: ${input.transcript?.length || 0}`);

    const transcriptText =
      input.transcript && input.transcript.trim().length > 0
        ? input.transcript
        : (await mockTranscriptTool({ encounter_id: input.encounter_id }))
          .transcript;

    console.log(`[speechToSoap] Processing transcript (length: ${transcriptText.length} chars)`);

    const { output } = await ai.generate({
      model: ai.options.model,
      prompt: [
        "You are a concise clinical summarizer that converts doctor-patient conversation text into a SOAP note.",
        "Use only information present in the transcript; do not invent vitals or labs.",
        `Encounter ID: ${input.encounter_id}`,
        "Transcript:",
        transcriptText,
        "Return a succinct SOAP note. Keep it factual, organized, and concise.",
      ].join("\n"),
      output: { schema: SoapSchema },
    });

    console.log(`[speechToSoap] Generated SOAP note for encounter ${input.encounter_id} (${output?.soap ? 'success' : 'empty'})`);

    const base = output ?? {
      soap: {
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
      },
      confidence: 0.5,
      model_version: "gemini-2.5-flash",
    };

    return {
      ...base,
      model_version: base.model_version || "gemini-2.5-flash",
    };
  }
);
