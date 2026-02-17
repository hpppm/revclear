import fs from "fs/promises";
import path from "path";

export type MedicalCode = {
  code: string;
  description: string;
  category: string;
};

export type MedicalCodesData = {
  icdCodes: MedicalCode[];
  cptCodes: MedicalCode[];
};

const icdPath = path.resolve(process.cwd(), "src/data/ai/mockIcdCodes.json");
const cptPath = path.resolve(process.cwd(), "src/data/ai/mockCptCodes.json");

let cachedCodes: MedicalCodesData | null = null;

export const loadMedicalCodes = async (): Promise<MedicalCodesData> => {
  if (cachedCodes) {
    return cachedCodes;
  }

  const [icdRaw, cptRaw] = await Promise.all([
    fs.readFile(icdPath, "utf-8"),
    fs.readFile(cptPath, "utf-8"),
  ]);

  const icdCodes: MedicalCode[] = JSON.parse(icdRaw);
  const cptCodes: MedicalCode[] = JSON.parse(cptRaw);

  cachedCodes = {
    icdCodes,
    cptCodes,
  };

  return cachedCodes;
};
