import { z } from "zod";
import logger from "../../../utils/logger";

const CodeMatchSchema = z.object({
  code: z.string(),
  description: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(1),
});

export const SoapToCodesOutputSchema = z.object({
  icdMatches: z.array(CodeMatchSchema).max(3),
  cptMatches: z.array(CodeMatchSchema).max(3),
  model_version: z.string(),
});

export type CodeMatchResult = z.infer<typeof SoapToCodesOutputSchema>;

type CodeInput = {
  soapNote: string;
  icdListText: string;
  cptListText: string;
};

type CodeMatcher = {
  match(input: CodeInput): Promise<CodeMatchResult>;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "";
const OLLAMA_CODES_MODEL = process.env.OLLAMA_CODES_MODEL || OLLAMA_MODEL;
const CODES_API_URL = process.env.CODES_API_URL || "";

const buildPrompt = ({ soapNote, icdListText, cptListText }: CodeInput) => `You are a medical coding expert. Match the SOAP note to the most relevant ICD-10 diagnosis codes and CPT procedure codes ONLY from the lists provided.

SOAP NOTE:
${soapNote}

AVAILABLE ICD-10 CODES (Diagnosis):
${icdListText}

AVAILABLE CPT CODES (Procedures):
${cptListText}

INSTRUCTIONS:
1) Return up to 3 ICD-10 and up to 3 CPT codes that best match the SOAP content.
2) For each match, include a confidence score (0-1) based on fit.
3) Only return codes from the provided lists. Do not invent codes.
4) Order matches by confidence (highest first).
Return JSON matching this exact schema:
{"icdMatches":[{"code":"string","description":"string","category":"string","confidence":0.0}],"cptMatches":[{"code":"string","description":"string","category":"string","confidence":0.0}],"model_version":"string"}`;

const safeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const clampConfidence = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
};

const normalizeMatches = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    return {
      code: safeString(e.code),
      description: safeString(e.description),
      category: safeString(e.category),
      confidence: clampConfidence(e.confidence),
    };
  });
};

const normalizeCodeOutput = (raw: unknown): CodeMatchResult => {
  let parsed: unknown = {};
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  }

  const obj = parsed as Record<string, unknown>;
  return {
    icdMatches: normalizeMatches(obj.icdMatches),
    cptMatches: normalizeMatches(obj.cptMatches),
    model_version: safeString(obj.model_version) || OLLAMA_CODES_MODEL || "ollama",
  };
};

class OllamaCodeMatcher implements CodeMatcher {
  async match(input: CodeInput): Promise<CodeMatchResult> {
    if (!OLLAMA_CODES_MODEL) {
      throw new Error("Missing OLLAMA_CODES_MODEL/OLLAMA_MODEL. Set one in backend/.env.");
    }
    const url = `${OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/generate`;
    logger.debug({ model: OLLAMA_CODES_MODEL }, 'OllamaCodeMatcher: sending request');

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CODES_MODEL,
        prompt: buildPrompt(input),
        stream: false,
        format: "json",
      }),
    });

    logger.debug({ status: response.status }, 'OllamaCodeMatcher: response received');
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama codes request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { response?: unknown };
    const normalized = normalizeCodeOutput(data.response);
    return SoapToCodesOutputSchema.parse(normalized);
  }
}

class HttpEndpointCodeMatcher implements CodeMatcher {
  constructor(private readonly endpoint: string) {}

  async match(input: CodeInput): Promise<CodeMatchResult> {
    logger.debug({}, 'HttpEndpointCodeMatcher: sending request');
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soapNote: input.soapNote,
        icdListText: input.icdListText,
        cptListText: input.cptListText,
      }),
    });

    logger.debug({ status: response.status }, 'HttpEndpointCodeMatcher: response received');
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`External codes endpoint failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as unknown;
    const normalized = normalizeCodeOutput(data);
    return SoapToCodesOutputSchema.parse(normalized);
  }
}

let matcherSingleton: CodeMatcher | null = null;

export const getCodeMatcher = (): CodeMatcher => {
  if (!matcherSingleton) {
    matcherSingleton = CODES_API_URL
      ? new HttpEndpointCodeMatcher(CODES_API_URL)
      : new OllamaCodeMatcher();
  }
  return matcherSingleton;
};
