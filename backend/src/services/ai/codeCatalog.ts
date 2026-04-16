import fs from "fs";
import path from "path";
import icdCurated from "../../data/ai/icd_curated.json";

export type CodeType = "icd10" | "cpt";

export type MedicalCodeRecord = {
  code: string;
  description: string;
  category: string;
  code_type: CodeType;
  source: string;
  text: string;
};

type IcdSource = Array<{
  code: string;
  description: string;
  category?: string;
}>;

type CuratedCptCode = {
  code: string;
  short_description: string;
  clinical: { type: string; complexity: string | null };
  billing: { is_timed: boolean; unit_minutes: number | null };
  metadata: { confidence: string; source: string };
};

type CuratedCptData = Record<string, CuratedCptCode[]>;

const readMaybeJson = <T>(candidatePaths: string[]): T | null => {
  for (const candidate of candidatePaths) {
    if (!fs.existsSync(candidate)) continue;
    const raw = fs.readFileSync(candidate, "utf8");
    return JSON.parse(raw) as T;
  }
  return null;
};

const resolveIcdSource = (): IcdSource => {
  const localPath = path.resolve(__dirname, "../../data/ai/icd_curated.json");
  const data = readMaybeJson<IcdSource>([localPath]);
  if (!data) {
    throw new Error("Unable to load ICD code catalog");
  }
  return data;
};

const resolveCptSource = (): CuratedCptData => {
  const localPath = path.resolve(__dirname, "../../data/ai/cpt_curated.json");
  const data = readMaybeJson<CuratedCptData>([localPath]);
  if (!data) {
    throw new Error("Unable to load CPT code catalog");
  }
  return data;
};

const flattenCptCodes = (data: CuratedCptData): MedicalCodeRecord[] => {
  const seen = new Set<string>();
  const records: MedicalCodeRecord[] = [];

  for (const [specialty, codes] of Object.entries(data)) {
    for (const entry of codes) {
      if (seen.has(entry.code)) continue;
      seen.add(entry.code);
      records.push({
        code: entry.code,
        description: entry.short_description,
        category: entry.clinical.type || specialty,
      code_type: "cpt",
      source: entry.metadata.source,
      text: `${entry.code} - ${entry.short_description} (${entry.clinical.type || specialty})`,
    });
  }
  }

  return records;
};

const flattenIcdCodes = (data: IcdSource): MedicalCodeRecord[] =>
  data.map((entry) => ({
    code: entry.code,
    description: entry.description,
    category: entry.category || "general",
    code_type: "icd10",
    source: "seed_catalog",
    text: `${entry.code} - ${entry.description} (${entry.category || "general"})`,
  }));

export const loadMedicalCodeCatalog = (): MedicalCodeRecord[] => {
  const icdCodes = flattenIcdCodes(resolveIcdSource());
  const cptCodes = flattenCptCodes(resolveCptSource());
  return [...icdCodes, ...cptCodes];
};

export const formatCodeCatalogForPrompt = (records: MedicalCodeRecord[]): string =>
  records
    .map((code) => `- ${code.code}: ${code.description} [${code.category}]`)
    .join("\n");
