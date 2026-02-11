import fs from "fs/promises";
import path from "path";

type MockEncounter = {
  encounter_id: string;
  transcript: { text: string; [key: string]: unknown };
};

const dataPath = path.resolve(process.cwd(), "src/data/ai/mockEncounter.json");

export const getMockTranscript = async () => {
  const raw = await fs.readFile(dataPath, "utf-8");
  const parsed: MockEncounter = JSON.parse(raw);
  return {
    encounter_id: parsed.encounter_id,
    transcript: parsed.transcript?.text ?? "",
  };
};
