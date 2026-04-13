// TODO: Create icd10_curated.json with curated ICD-10 codes by specialty.
// When available, inject into buildPrompt() alongside CPT codes
// and wire into the /codes/search?type=icd endpoint.

import * as fs from "fs";
import * as path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import logger from "../../utils/logger";

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

// Lazy singleton — created on first call, reused for every subsequent request.
let pineconeIndex: ReturnType<InstanceType<typeof Pinecone>["index"]> | null = null;

const getPineconeIndex = () => {
  if (!pineconeIndex) {
    pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
      .index(process.env.PINECONE_INDEX_NAME!);
  }
  return pineconeIndex;
};

/**
 * Search Pinecone for the top-8 CPT codes most relevant to the SOAP assessment.
 * Uses the index's integrated embedding model — no OpenAI key required.
 * Returns the same line format as getCptCodesForPrompt() so downstream is unchanged.
 *
 * Falls back to the full CPT dump if Pinecone is not configured or the query
 * fails — the AI pipeline always continues.
 */
export const getRelevantCptCodes = async (soapAssessment: string): Promise<string> => {
  const pineconeKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!pineconeKey || !indexName) {
    logger.warn("Pinecone not configured — falling back to full CPT dump");
    return getCptCodesForPrompt();
  }

  try {
    const results = await getPineconeIndex().searchRecords({
      query: {
        topK: 8,
        inputs: { text: soapAssessment },
      },
      fields: ["code", "description", "specialty"],
    });

    type CptHitFields = { code: string; description: string; specialty: string };
    const lines = results.result.hits
      .filter((h) => h.fields)
      .map((h) => {
        const f = h.fields as CptHitFields;
        return `${f.code} - ${f.description} [${f.specialty}]`;
      });

    if (lines.length === 0) {
      logger.warn("Pinecone returned no matches — falling back to full CPT dump");
      return getCptCodesForPrompt();
    }

    logger.debug({ count: lines.length }, "getRelevantCptCodes: Pinecone results returned");
    return lines.join("\n");
  } catch (error) {
    logger.warn({ error }, "Pinecone query failed — falling back to full CPT dump");
    return getCptCodesForPrompt();
  }
};
