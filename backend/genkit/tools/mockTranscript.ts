import fs from "fs/promises";
import path from "path";
import { z } from "genkit";
import { ai } from "../config";

type MockEncounter = {
  encounter_id: string;
  transcript: { text: string; [key: string]: unknown };
};

const dataPath = path.resolve(process.cwd(), "genkit/data/mockEncounter.json");

export const mockTranscriptTool = ai.defineTool(
  {
    name: "mockTranscript",
    description: "Returns mock encounter transcript data for local testing.",
    inputSchema: z
      .object({
        encounter_id: z.string().optional().describe("Optional encounter id"),
      })
      .optional(),
    outputSchema: z.object({
      encounter_id: z.string(),
      transcript: z.string(),
    }),
  },
  async () => {
    const raw = await fs.readFile(dataPath, "utf-8");
    const parsed: MockEncounter = JSON.parse(raw);
    return {
      encounter_id: parsed.encounter_id,
      transcript: parsed.transcript?.text ?? "",
    };
  }
);
