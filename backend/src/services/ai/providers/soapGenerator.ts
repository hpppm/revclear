import { z } from "zod";
import logger from "../../../utils/logger";
import { scrubPHI } from "../../../utils/textScrubber";

export const SoapSchema = z.object({
  soap: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  confidence: z.number().min(0).max(1),
  model_version: z.string(),
});

type SoapOutput = z.infer<typeof SoapSchema>;

type GenerateSoapInput = {
  encounterId: string;
  transcriptText: string;
};

type SoapGenerator = {
  generate(input: GenerateSoapInput): Promise<SoapOutput>;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "";
const OLLAMA_SEED = Number(process.env.OLLAMA_SEED ?? "42");
const SOAP_API_URL = process.env.SOAP_API_URL || "";
const AI_SERVER_API_KEY = process.env.AI_SERVER_API_KEY || "";

// SECURITY: Ollama must only be reachable via localhost to prevent SSRF and
// unintended external exposure of the inference server.
const OLLAMA_ALLOWED_HOSTS = ["127.0.0.1", "localhost"];

const isPrivateOrInternalHostname = (hostname: string): boolean => {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (!hostname.includes(".")) return true;
  return false;
};

// SECURITY: Allowlist of approved external SOAP API hostnames.
// Any URL not matching this list is rejected to block SSRF attacks.
const SOAP_API_ALLOWLIST: string[] = (process.env.SOAP_API_ALLOWLIST || "").split(",").filter(Boolean);

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

const validateExternalSoapUrl = (url: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid SOAP_API_URL: "${url}"`);
  }

  const isLocalDevelopmentHttp =
    process.env.NODE_ENV !== "production" &&
    parsed.protocol === "http:" &&
    isPrivateOrInternalHostname(parsed.hostname);

  // SECURITY: External AI endpoints must use HTTPS to prevent credential and
  // PHI exposure over unencrypted connections. Local development is allowed
  // to use http://localhost or http://127.0.0.1 only.
  if (parsed.protocol !== "https:" && !isLocalDevelopmentHttp) {
    throw new Error(
      `SOAP_API_URL must use HTTPS unless it is a non-production internal endpoint. Received: "${parsed.protocol}//${parsed.hostname}"`,
    );
  }
  // SECURITY: Block any host not in the approved allowlist (SSRF prevention).
  if (SOAP_API_ALLOWLIST.length > 0 && !SOAP_API_ALLOWLIST.includes(parsed.hostname)) {
    throw new Error(
      `SOAP_API_URL hostname "${parsed.hostname}" is not in the approved allowlist.`,
    );
  }
};

// Stable role + schema — never changes between calls. Placed in the system
// role so Ollama can cache the KV activations for this prefix across requests.
const SOAP_SYSTEM_PROMPT = [
  "You are a concise clinical summarizer that converts doctor-patient conversation text into a SOAP note.",
  "Use only information present in the transcript; do not invent vitals or labs.",
  "Return JSON matching this exact schema:",
  '{"soap":{"subjective":"string","objective":"string","assessment":"string","plan":"string"},"confidence":0.0,"model_version":"string"}',
  "Keep sections factual and concise.",
].join("\n");

// Dynamic content only — encounter ID and transcript vary per call.
const buildSoapUserMessage = ({ encounterId, transcriptText }: GenerateSoapInput): string =>
  [`Encounter ID: ${encounterId}`, "Transcript:", transcriptText].join("\n");

const safeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const clampConfidence = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
};

const normalizeSoapOutput = (raw: unknown): SoapOutput => {
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

  const rawObj = parsed as Record<string, unknown>;
  const rawSoap =
    rawObj.soap && typeof rawObj.soap === "object"
      ? (rawObj.soap as Record<string, unknown>)
      : rawObj;

  return {
    soap: {
      subjective: safeString(rawSoap.subjective),
      objective: safeString(rawSoap.objective),
      assessment: safeString(rawSoap.assessment),
      plan: safeString(rawSoap.plan),
    },
    confidence: clampConfidence(rawObj.confidence),
    model_version: safeString(rawObj.model_version) || OLLAMA_MODEL || "ollama",
  };
};

class OllamaSoapGenerator implements SoapGenerator {
  async generate(input: GenerateSoapInput): Promise<SoapOutput> {
    if (!OLLAMA_MODEL) {
      throw new Error("Missing OLLAMA_MODEL. Set OLLAMA_MODEL in backend/.env.");
    }

    // SECURITY: Enforce localhost-only binding before making any request.
    validateOllamaUrl(OLLAMA_BASE_URL);

    const url = `${OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/chat`;
    logger.debug({ model: OLLAMA_MODEL, encounterId: input.encounterId }, 'OllamaSoapGenerator: sending request');

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: SOAP_SYSTEM_PROMPT },
          { role: "user", content: buildSoapUserMessage(input) },
        ],
        stream: false,
        format: "json",
        options: {
          temperature: 0,
          seed: OLLAMA_SEED,
        },
      }),
    });
    logger.debug({ status: response.status, encounterId: input.encounterId }, 'OllamaSoapGenerator: response received');

    if (!response.ok) {
      // SECURITY: Log the raw body server-side only; do not include it in the
      // thrown error message so it cannot surface in an API response.
      const body = await response.text();
      logger.error(
        { encounterId: input.encounterId, status: response.status, body },
        "OllamaSoapGenerator: upstream error",
      );
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: unknown } };
    const output = normalizeSoapOutput(data.message?.content);
    return SoapSchema.parse(output);
  }
}

class HttpEndpointSoapGenerator implements SoapGenerator {
  constructor(private readonly endpoint: string) {
    // SECURITY: Validate URL at construction time so misconfiguration is caught
    // at startup rather than on the first patient request.
    validateExternalSoapUrl(this.endpoint);
  }

  async generate(input: GenerateSoapInput): Promise<SoapOutput> {
    if (!AI_SERVER_API_KEY) {
      throw new Error("Missing AI_SERVER_API_KEY for external SOAP endpoint.");
    }

    // SECURITY: Scrub structured PHI patterns before the transcript leaves the
    // server. Free-text names cannot be redacted without NLP — a BAA with the
    // external AI provider is still required for full HIPAA compliance.
    const { scrubbed: scrubbedTranscript, redactionCount } = scrubPHI(input.transcriptText);
    logger.info(
      { encounterId: input.encounterId, redactionCount },
      "HttpEndpointSoapGenerator: PHI scrub applied before external transmission",
    );

    logger.debug({ encounterId: input.encounterId }, 'HttpEndpointSoapGenerator: sending request');
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVER_API_KEY,
      },
      body: JSON.stringify({
        encounterId: input.encounterId,
        transcriptText: scrubbedTranscript,
      }),
    });
    logger.debug({ status: response.status, encounterId: input.encounterId }, 'HttpEndpointSoapGenerator: response received');
    if (!response.ok) {
      // SECURITY: Log the raw body server-side only; do not include it in the
      // thrown error message so it cannot surface in an API response.
      const body = await response.text();
      logger.error(
        { encounterId: input.encounterId, status: response.status, body },
        "HttpEndpointSoapGenerator: upstream error",
      );
      throw new Error(`External SOAP endpoint failed with status ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    const output = normalizeSoapOutput(data);
    return SoapSchema.parse(output);
  }
}

let soapGeneratorSingleton: SoapGenerator | null = null;

export const getSoapGenerator = (): SoapGenerator => {
  if (!soapGeneratorSingleton) {
    soapGeneratorSingleton = SOAP_API_URL
      ? new HttpEndpointSoapGenerator(SOAP_API_URL)
      : new OllamaSoapGenerator();
  }
  return soapGeneratorSingleton;
};
