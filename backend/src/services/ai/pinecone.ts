import logger from "../../utils/logger";
import { MedicalCodeRecord, loadMedicalCodeCatalog, CodeType } from "./codeCatalog";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "";
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST || "";
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || "medical-codes";
const PINECONE_API_VERSION = process.env.PINECONE_API_VERSION || "2026-04";

type PineconeSearchMatch = {
  _id: string;
  score?: number;
  fields?: Record<string, unknown>;
};

type RetrievedCode = {
  code: string;
  description: string;
  category: string;
  confidence: number;
  code_type: CodeType;
};

const requirePineconeConfig = () => {
  if (!PINECONE_API_KEY) {
    throw new Error("Missing PINECONE_API_KEY");
  }
  if (!PINECONE_INDEX_HOST) {
    throw new Error("Missing PINECONE_INDEX_HOST");
  }
};

const pineconeFetch = async (path: string, init: RequestInit = {}) => {
  requirePineconeConfig();
  const host = PINECONE_INDEX_HOST.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const response = await fetch(`https://${host}${path}`, {
    ...init,
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
      "X-Pinecone-API-Version": PINECONE_API_VERSION,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(
      { status: response.status, body: body.slice(0, 2000) },
      "pinecone request failed",
    );
    throw new Error(`Pinecone request failed with status ${response.status}`);
  }

  return response;
};

export const checkPineconeHealth = async () => {
  try {
    const response = await pineconeFetch("/describe_index_stats", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const payload = (await response.json()) as { namespace?: Record<string, unknown> };
    return {
      healthy: true,
      message: "Pinecone index is reachable",
      details: payload,
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: `Pinecone unreachable (${error?.message || "error"})`,
    };
  }
};

export const upsertMedicalCodes = async (records: MedicalCodeRecord[]) => {
  const groups = records.reduce<Record<CodeType, MedicalCodeRecord[]>>(
    (acc, record) => {
      acc[record.code_type].push(record);
      return acc;
    },
    { icd10: [], cpt: [] },
  );

  for (const [codeType, group] of Object.entries(groups) as Array<[CodeType, MedicalCodeRecord[]]>) {
    if (group.length === 0) continue;
    const payload = group
      .map((record) =>
        JSON.stringify({
          _id: `${record.code_type}:${record.code}`,
          text: record.text,
          category: record.category,
          code: record.code,
          description: record.description,
          code_type: record.code_type,
          source: record.source,
        }),
      )
      .join("\n");

    logger.info({ count: group.length, codeType }, "upserting medical codes to pinecone");
    await pineconeFetch(`/records/namespaces/${PINECONE_NAMESPACE}-${codeType}/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
      },
      body: `${payload}\n`,
    });
  }
};

const mapMatch = (match: PineconeSearchMatch, codeType: CodeType): RetrievedCode | null => {
  const fields = match.fields || {};
  const code = typeof fields.code === "string" ? fields.code : "";
  const description = typeof fields.description === "string" ? fields.description : "";
  const category = typeof fields.category === "string" ? fields.category : "";
  if (!code || !description) return null;

  return {
    code,
    description,
    category,
    confidence: typeof match.score === "number" ? match.score : 0.5,
    code_type: codeType,
  };
};

const searchNamespace = async (query: string, codeType: CodeType, topK: number) => {
  const response = await pineconeFetch(`/records/namespaces/${PINECONE_NAMESPACE}-${codeType}/search`, {
    method: "POST",
    body: JSON.stringify({
      query: { inputs: { text: query }, top_k: topK },
      fields: ["code", "description", "category", "code_type", "source"],
    }),
  });

  const data = (await response.json()) as { result?: { hits?: PineconeSearchMatch[] } };
  const hits = data.result?.hits || [];
  return hits
    .map((hit) => mapMatch(hit, codeType))
    .filter((value): value is RetrievedCode => Boolean(value));
};

export const ensurePineconeMedicalCodeIndex = async () => {
  const catalog = loadMedicalCodeCatalog();
  await upsertMedicalCodes(catalog);
};

export const searchMedicalCodes = async (query: string, topK = 5) => {
  const [icdMatches, cptMatches] = await Promise.all([
    searchNamespace(query, "icd10", topK),
    searchNamespace(query, "cpt", topK),
  ]);

  return { icdMatches, cptMatches };
};

export const getPineconeNamespace = () => PINECONE_NAMESPACE;
