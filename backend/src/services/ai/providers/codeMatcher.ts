import { z } from "zod";
import logger from "../../../utils/logger";
import { getCptCodesForPrompt } from "../../../data/ai/cptDataLoader";

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
};

type CodeMatcher = {
  match(input: CodeInput): Promise<CodeMatchResult>;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "";
const OLLAMA_CODES_MODEL = process.env.OLLAMA_CODES_MODEL || OLLAMA_MODEL;
const CODES_API_URL = process.env.CODES_API_URL || "";
const AI_SERVER_API_KEY = process.env.AI_SERVER_API_KEY || "";

// SECURITY: Ollama must only be reachable via localhost to prevent SSRF and
// unintended external exposure of the inference server.
const OLLAMA_ALLOWED_HOSTS = ["127.0.0.1", "localhost"];

// SECURITY: Allowlist of approved external codes API hostnames.
// Any URL not matching this list is rejected to block SSRF attacks.
const CODES_API_ALLOWLIST: string[] = (process.env.CODES_API_ALLOWLIST || "").split(",").filter(Boolean);

const validateOllamaUrl = (url: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid OLLAMA_BASE_URL: "${url}"`);
  }
  if (!OLLAMA_ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error(
      `OLLAMA_BASE_URL hostname "${parsed.hostname}" is not allowed. Must be localhost or 127.0.0.1.`,
    );
  }
};

const validateExternalCodesUrl = (url: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid CODES_API_URL: "${url}"`);
  }
  const isLocalHttpEndpoint =
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  const allowLocalHttp = process.env.NODE_ENV !== "production" && isLocalHttpEndpoint;

  // SECURITY: External AI endpoints must use HTTPS to prevent credential and
  // PHI exposure over unencrypted connections. Local development may use a
  // loopback HTTP endpoint when the AI server runs on the same machine.
  if (parsed.protocol !== "https:" && !allowLocalHttp) {
    throw new Error(`CODES_API_URL must use HTTPS. Received: "${parsed.protocol}"`);
  }
  // SECURITY: Block any host not in the approved allowlist (SSRF prevention).
  if (CODES_API_ALLOWLIST.length > 0 && !CODES_API_ALLOWLIST.includes(parsed.hostname)) {
    throw new Error(
      `CODES_API_URL hostname "${parsed.hostname}" is not in the approved allowlist.`,
    );
  }
};

const buildPrompt = ({ soapNote }: CodeInput) => `You are a certified medical coder with deep knowledge of ICD-10-CM and CPT coding standards. Based on the SOAP note below, identify the most appropriate diagnosis and procedure codes.

SOAP NOTE:
${soapNote}

CURATED CPT CODE REFERENCE:
The following are verified CPT codes for this practice. Prefer these codes when they match the documented services. If no curated code fits, you may use other valid CPT codes from your training knowledge.

${getCptCodesForPrompt()}

INSTRUCTIONS:
1) Return up to 3 ICD-10-CM diagnosis codes that best match the documented conditions using your training knowledge.
2) Return up to 3 CPT procedure codes. PREFER codes from the CURATED CPT CODE REFERENCE above when they match the documented services. Fall back to your training knowledge only if no curated code is appropriate.
3) Use real, valid ICD-10-CM codes from your training knowledge, and prefer curated CPT codes from the reference list.
4) For each code include: the code, its official description, its category, and a confidence score (0.0-1.0).
5) Order matches by confidence (highest first).
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
    // SECURITY: Enforce localhost-only binding before making any request.
    validateOllamaUrl(OLLAMA_BASE_URL);
    const url = `${OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/chat`;
    logger.debug({ model: OLLAMA_CODES_MODEL }, 'OllamaCodeMatcher: sending request');

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CODES_MODEL,
        messages: [{ role: "user", content: buildPrompt(input) }],
        stream: false,
        format: "json",
      }),
    });

    logger.debug({ status: response.status }, 'OllamaCodeMatcher: response received');
    if (!response.ok) {
      // SECURITY: Log the raw body server-side only; do not include it in the
      // thrown error message so it cannot surface in an API response.
      const body = await response.text();
      logger.error(
        { status: response.status, body },
        "OllamaCodeMatcher: upstream error",
      );
      throw new Error(`Ollama codes request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: unknown } };
    const normalized = normalizeCodeOutput(data.message?.content);
    return SoapToCodesOutputSchema.parse(normalized);
  }
}

class HttpEndpointCodeMatcher implements CodeMatcher {
  constructor(private readonly endpoint: string) {
    // SECURITY: Validate URL at construction time so misconfiguration is caught
    // at startup rather than on the first patient request.
    validateExternalCodesUrl(this.endpoint);
  }

  async match(input: CodeInput): Promise<CodeMatchResult> {
    if (!AI_SERVER_API_KEY) {
      throw new Error("Missing AI_SERVER_API_KEY for external codes endpoint.");
    }

    logger.debug({}, 'HttpEndpointCodeMatcher: sending request');
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVER_API_KEY,
      },
      body: JSON.stringify({
        soapNote: input.soapNote,
      }),
    });

    logger.debug({ status: response.status }, 'HttpEndpointCodeMatcher: response received');
    if (!response.ok) {
      // SECURITY: Log the raw body server-side only; do not include it in the
      // thrown error message so it cannot surface in an API response.
      const body = await response.text();
      logger.error(
        { status: response.status, body },
        "HttpEndpointCodeMatcher: upstream error",
      );
      throw new Error(`External codes endpoint failed with status ${response.status}`);
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
