// TODO: Create icd10_curated.json with curated ICD-10 codes by specialty.
// When available, inject into buildPrompt() alongside CPT codes
// and wire into the /codes/search?type=icd endpoint.

import * as fs from "fs";
import * as path from "path";

export type CuratedCptCode = {
  code: string;
  short_description: string;
  clinical: { type: string; complexity: string | null };
  billing: { is_timed: boolean; unit_minutes: number | null };
  metadata: { confidence: string; source: string };
};

type CuratedCptData = Record<string, CuratedCptCode[]>;

let cache: CuratedCptData | null = null;
let promptCache: string | null = null;

const loadData = (): CuratedCptData => {
  if (cache) return cache;
  const filePath = path.resolve(__dirname, "cpt_curated.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cache = JSON.parse(raw) as CuratedCptData;
  return cache;
};

export const getCuratedCptCodes = (): CuratedCptData => loadData();

export const getFlatCptCodes = (): CuratedCptCode[] => {
  const data = loadData();
  const seen = new Set<string>();
  return Object.values(data)
    .flat()
    .filter((entry) => {
      if (seen.has(entry.code)) return false;
      seen.add(entry.code);
      return true;
    });
};

export const getCptCodesForPrompt = (): string => {
  if (promptCache !== null) return promptCache;
  const data = loadData();
  const lines: string[] = [];
  for (const [specialty, codes] of Object.entries(data)) {
    const seen = new Set<string>();
    for (const entry of codes) {
      if (seen.has(entry.code)) continue;
      seen.add(entry.code);
      lines.push(`${entry.code} - ${entry.short_description} [${specialty}]`);
    }
  }
  promptCache = lines.join("\n");
  return promptCache;
};
