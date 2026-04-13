// TODO: Create icd10_curated.json with curated ICD-10 codes by specialty.
// When available, inject into buildPrompt() alongside CPT codes
// and wire into the /codes/search?type=icd endpoint.

import * as fs from "fs";
import * as path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
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

// Lazy singletons — created on first call, reused for every subsequent request.
let pineconeIndex: ReturnType<InstanceType<typeof Pinecone>["index"]> | null = null;
let openaiClient: OpenAI | null = null;

const getPineconeIndex = () => {
  if (!pineconeIndex) {
    const apiKey = process.env.PINECONE_API_KEY!;
    const indexName = process.env.PINECONE_INDEX_NAME!;
    pineconeIndex = new Pinecone({ apiKey }).index(indexName);
  }
  return pineconeIndex;
};

const getOpenAIClient = () => {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return openaiClient;
};

/**
 * Embed the SOAP assessment section and query Pinecone for the top-8 most
 * relevant CPT codes. Returns the same line format as getCptCodesForPrompt()
 * so downstream prompt builders need no changes.
 *
 * Falls back to the full CPT dump if Pinecone/OpenAI are not configured or
 * if the query fails — the AI pipeline always continues.
 */
export const getRelevantCptCodes = async (soapAssessment: string): Promise<string> => {
  const pineconeKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!pineconeKey || !indexName || !openaiKey) {
    logger.warn("Pinecone/OpenAI not configured — falling back to full CPT dump");
    return getCptCodesForPrompt();
  }

  try {
    const embeddingRes = await getOpenAIClient().embeddings.create({
      model: "text-embedding-3-small",
      input: soapAssessment,
      encoding_format: "float",
    });

    const queryRes = await getPineconeIndex().query({
      vector: embeddingRes.data[0].embedding,
      topK: 8,
      includeMetadata: true,
    });

    const lines = queryRes.matches
      .filter((m) => m.metadata)
      .map((m) => `${m.metadata!.code} - ${m.metadata!.description} [${m.metadata!.specialty}]`);

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
