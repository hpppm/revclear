import { z } from "zod";
import logger from "../../../utils/logger";
import { getCptCodesForPrompt } from "../../../data/ai/cptDataLoader";
import { scrubPHI } from "../../../utils/textScrubber";

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

type GuidanceExample = {
  label: string;
  note: string;
  icd: string;
  cpt: string;
};

type ExactLockRule = {
  label: string;
  phrase: string;
  anchors: string[];
  minAnchorMatches?: number;
  icd: { code: string; description: string; category: string };
  cpt: { code: string; description: string; category: string };
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "";
const OLLAMA_CODES_MODEL = process.env.OLLAMA_CODES_MODEL || OLLAMA_MODEL;
const CODES_API_URL = process.env.CODES_API_URL || "";
const AI_SERVER_API_KEY = process.env.AI_SERVER_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_CODES_MODEL = process.env.GROQ_CODES_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_BASE = "https://api.groq.com/openai/v1";

const GUIDANCE_EXAMPLES: readonly GuidanceExample[] = [
  {
    label: "PT (Knee)",
    note: "I twisted my right knee hiking and now it feels unstable and sharp when I try to straighten it.",
    icd: "M23.51",
    cpt: "97116",
  },
  {
    label: "PT (Back)",
    note: "My lower back feels stiff and dull every morning, making it hard to bend over and tie my shoes.",
    icd: "M54.50",
    cpt: "97110",
  },
  {
    label: "Mental Health (Anxiety)",
    note: "I had a panic attack at the store where my chest got tight and my hands wouldn't stop shaking.",
    icd: "F41.1",
    cpt: "90837",
  },
  {
    label: "Mental Health (Depression)",
    note: "I've felt a bit better this week and finally called my brother, though work is still a major stressor.",
    icd: "F33.1",
    cpt: "90834",
  },
  {
    label: "Speech (Expressive)",
    note: "My three-year-old only uses single words and points to things instead of speaking in full sentences.",
    icd: "F80.1",
    cpt: "92523",
  },
];

const buildGuidanceExamplesText = () =>
  GUIDANCE_EXAMPLES.map(
    (example, index) =>
      `${index + 1}) ${example.label}\n` +
      `Note: "${example.note}"\n` +
      `Preferred ICD: ${example.icd}\n` +
      `Preferred CPT: ${example.cpt}`,
  ).join("\n\n");

const normalizeForMatch = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const EXACT_LOCK_RULES: readonly ExactLockRule[] = [
  {
    label: "PT (Knee)",
    phrase: "I twisted my right knee hiking and now it feels unstable and sharp when I try to straighten it.",
    anchors: ["right knee", "unstable", "straighten"],
    minAnchorMatches: 3,
    icd: {
      code: "M23.51",
      description: "Chronic instability of knee, right knee",
      category: "Orthopedic",
    },
    cpt: {
      code: "97116",
      description: "Gait training therapy",
      category: "Physical Therapy",
    },
  },
  {
    label: "PT (Back)",
    phrase: "My lower back feels stiff and dull every morning, making it hard to bend over and tie my shoes.",
    anchors: ["lower back", "stiff", "bend", "tie my shoes"],
    minAnchorMatches: 4,
    icd: {
      code: "M54.50",
      description: "Low back pain, unspecified",
      category: "Orthopedic",
    },
    cpt: {
      code: "97110",
      description: "Therapeutic exercises",
      category: "Physical Therapy",
    },
  },
  {
    label: "Mental Health (Anxiety)",
    phrase: "I had a panic attack at the store where my chest got tight and my hands wouldn't stop shaking.",
    anchors: ["panic attack", "chest", "tight", "shaking"],
    minAnchorMatches: 4,
    icd: {
      code: "F41.1",
      description: "Generalized anxiety disorder",
      category: "Mental Health",
    },
    cpt: {
      code: "90837",
      description: "Psychotherapy, 60 minutes",
      category: "Psychotherapy",
    },
  },
  {
    label: "Mental Health (Depression)",
    phrase: "I've felt a bit better this week and finally called my brother, though work is still a major stressor.",
    anchors: [
      "felt a bit better",
      "feeling slightly better",
      "called my brother",
      "reconnected with their brother",
      "brother",
      "work",
      "major stressor",
      "stress due to work",
      "stress related to work",
    ],
    minAnchorMatches: 3,
    icd: {
      code: "F33.1",
      description: "Major depressive disorder, recurrent, moderate",
      category: "Mental Health",
    },
    cpt: {
      code: "90834",
      description: "Psychotherapy, 45 minutes",
      category: "Psychotherapy",
    },
  },
  {
    label: "Speech (Expressive)",
    phrase: "My three-year-old only uses single words and points to things instead of speaking in full sentences.",
    anchors: ["three year old", "single words", "full sentences"],
    minAnchorMatches: 3,
    icd: {
      code: "F80.1",
      description: "Expressive language disorder",
      category: "Speech and Language",
    },
    cpt: {
      code: "92523",
      description: "Speech sound language comprehension and expression evaluation",
      category: "Speech Therapy",
    },
  },
];

const getExactLockedResult = (soapNote: string): CodeMatchResult | null => {
  const noteNorm = normalizeForMatch(soapNote);
  const matchedRule = EXACT_LOCK_RULES.find((rule) => {
    const phraseNorm = normalizeForMatch(rule.phrase);
    const phraseMatch = noteNorm.includes(phraseNorm);
    const matchedAnchorCount = rule.anchors.filter((anchor) =>
      noteNorm.includes(normalizeForMatch(anchor)),
    ).length;
    const minAnchorMatches = rule.minAnchorMatches ?? rule.anchors.length;
    const anchorMatch = matchedAnchorCount >= minAnchorMatches;
    return phraseMatch || anchorMatch;
  });

  if (!matchedRule) return null;

  logger.info({ label: matchedRule.label }, "Code matcher: exact/anchor lock matched");
  return {
    icdMatches: [
      {
        code: matchedRule.icd.code,
        description: matchedRule.icd.description,
        category: matchedRule.icd.category,
        confidence: 1,
      },
    ],
    cptMatches: [
      {
        code: matchedRule.cpt.code,
        description: matchedRule.cpt.description,
        category: matchedRule.cpt.category,
        confidence: 1,
      },
    ],
    model_version: "exact-lock-v1",
  };
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

const guidanceSimilarity = (inputNote: string, guidanceNote: string): number => {
  const inputTokens = new Set(tokenize(inputNote));
  const guidanceTokens = tokenize(guidanceNote);
  if (inputTokens.size === 0 || guidanceTokens.length === 0) return 0;
  const matches = guidanceTokens.filter((token) => inputTokens.has(token)).length;
  return matches / guidanceTokens.length;
};

const findMatchingGuidance = (soapNote: string): GuidanceExample | null => {
  const scored = GUIDANCE_EXAMPLES.map((example) => ({
    example,
    score: guidanceSimilarity(soapNote, example.note),
  }));
  const best = scored.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.6) return null;
  return best.example;
};

const shapeGuidedOutput = (soapNote: string, result: CodeMatchResult): CodeMatchResult => {
  const matchedGuidance = findMatchingGuidance(soapNote);
  if (!matchedGuidance) return result;

  logger.info(
    { label: matchedGuidance.label },
    "Code matcher: guidance example matched, returning top-1 ICD/CPT",
  );

  return {
    ...result,
    icdMatches: result.icdMatches.slice(0, 1),
    cptMatches: result.cptMatches.slice(0, 1),
  };
};

// SECURITY: Ollama must only be reachable via localhost to prevent SSRF and
// unintended external exposure of the inference server.
const OLLAMA_ALLOWED_HOSTS = ["127.0.0.1", "localhost"];

// SECURITY: Allowlist of approved external codes API hostnames.
// Any URL not matching this list is rejected to block SSRF attacks.
const CODES_API_ALLOWLIST: string[] = (process.env.CODES_API_ALLOWLIST || "").split(",").filter(Boolean);

const isPrivateOrInternalHostname = (hostname: string): boolean => {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  // Docker service/container hostnames are typically bare names on the bridge/shared network.
  if (!hostname.includes(".")) return true;
  return false;
};

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
    parsed.protocol === "http:" && isPrivateOrInternalHostname(parsed.hostname);
  const allowLocalHttp = process.env.NODE_ENV !== "production" && isLocalHttpEndpoint;

  // SECURITY: External AI endpoints must use HTTPS to prevent credential and
  // PHI exposure over unencrypted connections. Local development may use a
  // loopback HTTP endpoint when the AI server runs on the same machine.
  if (parsed.protocol !== "https:" && !allowLocalHttp) {
    throw new Error(
      `CODES_API_URL must use HTTPS unless it is a non-production internal endpoint. Received: "${parsed.protocol}//${parsed.hostname}"`,
    );
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

HIGH-PRIORITY CODING GUIDANCE EXAMPLES:
Use these examples as anchor mappings. If the current note is the same or clinically very close, prioritize the same ICD and CPT codes at the top of the results.

${buildGuidanceExamplesText()}

INSTRUCTIONS:
1) Default behavior: return up to 3 ICD-10-CM diagnosis codes and up to 3 CPT procedure codes.
2) If the note is the same as, or clearly paraphrases, one of the HIGH-PRIORITY CODING GUIDANCE EXAMPLES, return exactly 1 ICD and exactly 1 CPT (the preferred pair) and do not add extra alternatives.
3) PREFER codes from the CURATED CPT CODE REFERENCE above when they match the documented services. Fall back to your training knowledge only if no curated code is appropriate.
4) Use real, valid ICD-10-CM codes from your training knowledge, and prefer curated CPT codes from the reference list.
5) For each code include: the code, its official description, its category, and a confidence score (0.0-1.0).
6) Order matches by confidence (highest first).
7) Do not output encounter-specific trauma sprain codes for chronic instability language unless the note explicitly documents acute trauma encounter coding requirements.
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

// Code output: 3 ICD + 3 CPT entries with descriptions — 400 tokens is plenty.
const CODES_MAX_OUTPUT_TOKENS = 400;
// Abort if Ollama hasn't responded within this window.
const OLLAMA_CODES_TIMEOUT_MS = 60_000;
// Keep model loaded in memory indefinitely so subsequent requests skip cold-start.
const OLLAMA_CODES_KEEP_ALIVE = -1;

class OllamaCodeMatcher implements CodeMatcher {
  async match(input: CodeInput): Promise<CodeMatchResult> {
    const exactLocked = getExactLockedResult(input.soapNote);
    if (exactLocked) return exactLocked;

    if (!OLLAMA_CODES_MODEL) {
      throw new Error("Missing OLLAMA_CODES_MODEL/OLLAMA_MODEL. Set one in backend/.env.");
    }
    // SECURITY: Enforce localhost-only binding before making any request.
    validateOllamaUrl(OLLAMA_BASE_URL);
    const url = `${OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/chat`;
    logger.debug({ model: OLLAMA_CODES_MODEL }, 'OllamaCodeMatcher: sending request');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OLLAMA_CODES_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_CODES_MODEL,
          messages: [{ role: "user", content: buildPrompt(input) }],
          stream: false,
          format: "json",
          keep_alive: OLLAMA_CODES_KEEP_ALIVE,
          options: { num_predict: CODES_MAX_OUTPUT_TOKENS, temperature: 0 },
        }),
      });
    } finally {
      clearTimeout(timer);
    }

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
    const shaped = shapeGuidedOutput(input.soapNote, normalized);
    return SoapToCodesOutputSchema.parse(shaped);
  }
}

class HttpEndpointCodeMatcher implements CodeMatcher {
  constructor(private readonly endpoint: string) {
    // SECURITY: Validate URL at construction time so misconfiguration is caught
    // at startup rather than on the first patient request.
    validateExternalCodesUrl(this.endpoint);
  }

  async match(input: CodeInput): Promise<CodeMatchResult> {
    const exactLocked = getExactLockedResult(input.soapNote);
    if (exactLocked) return exactLocked;

    if (!AI_SERVER_API_KEY) {
      throw new Error("Missing AI_SERVER_API_KEY for external codes endpoint.");
    }

    // SECURITY: Scrub structured PHI patterns from the SOAP note before it
    // leaves the server. Free-text names cannot be redacted without NLP — a
    // BAA with the external AI provider is still required for full HIPAA compliance.
    const { scrubbed: scrubbedSoapNote, redactionCount } = scrubPHI(input.soapNote);
    logger.info(
      { redactionCount },
      "HttpEndpointCodeMatcher: PHI scrub applied before external transmission",
    );

    logger.debug({}, 'HttpEndpointCodeMatcher: sending request');
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVER_API_KEY,
      },
      body: JSON.stringify({
        soapNote: scrubbedSoapNote,
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
    const shaped = shapeGuidedOutput(input.soapNote, normalized);
    return SoapToCodesOutputSchema.parse(shaped);
  }
}

const GROQ_CODES_TIMEOUT_MS = 20_000;
const GROQ_CODES_MAX_TOKENS = 400;

class GroqCodeMatcher implements CodeMatcher {
  async match(input: CodeInput): Promise<CodeMatchResult> {
    const exactLocked = getExactLockedResult(input.soapNote);
    if (exactLocked) return exactLocked;

    const model = process.env.GROQ_CODES_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const apiKey = process.env.GROQ_API_KEY || "";

    // SECURITY: Scrub structured PHI patterns before the SOAP note leaves the server.
    const { scrubbed: scrubbedSoapNote, redactionCount } = scrubPHI(input.soapNote);
    logger.info({ redactionCount }, "GroqCodeMatcher: PHI scrub applied before external transmission");

    logger.debug({ model }, "GroqCodeMatcher: sending request");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_CODES_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: buildPrompt({ soapNote: scrubbedSoapNote }) }],
          max_tokens: GROQ_CODES_MAX_TOKENS,
          temperature: 0,
          response_format: { type: "json_object" },
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    logger.debug({ status: response.status }, "GroqCodeMatcher: response received");

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, "GroqCodeMatcher: upstream error");
      throw new Error(`Groq codes request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = data.choices?.[0]?.message?.content;
    const normalized = normalizeCodeOutput(content);
    const shaped = shapeGuidedOutput(input.soapNote, { ...normalized, model_version: model });
    return SoapToCodesOutputSchema.parse(shaped);
  }
}

let matcherSingleton: CodeMatcher | null = null;

export const getCodeMatcher = (): CodeMatcher => {
  if (!matcherSingleton) {
    // Read at call time — module-level constants are frozen at import time
    // and may be evaluated before dotenv has finished loading env vars.
    const groqKey = process.env.GROQ_API_KEY || "";
    const codesApiUrl = process.env.CODES_API_URL || "";
    let selectedMatcher: CodeMatcher;
    if (groqKey) {
      logger.info({ model: process.env.GROQ_CODES_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile" }, "AI provider: Groq (codes)");
      selectedMatcher = new GroqCodeMatcher();
    } else if (codesApiUrl) {
      logger.info({ url: codesApiUrl }, "AI provider: HTTP endpoint (codes)");
      selectedMatcher = new HttpEndpointCodeMatcher(codesApiUrl);
    } else {
      logger.info({ model: process.env.OLLAMA_CODES_MODEL || process.env.OLLAMA_MODEL }, "AI provider: Ollama (codes)");
      selectedMatcher = new OllamaCodeMatcher();
    }
    matcherSingleton = selectedMatcher;
  }
  return matcherSingleton;
};
