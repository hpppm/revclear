import { z } from "zod";
import logger from "../../../utils/logger";

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
const SOAP_API_URL = process.env.SOAP_API_URL || "";

// HIPAA guard: PHI must not be sent to a remote host without a BAA.
// Warn in dev, throw in production if Ollama is not local.
const isLocalHost = (url: string) =>
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url);

if (!SOAP_API_URL && !isLocalHost(OLLAMA_BASE_URL)) {
  const msg = `HIPAA: OLLAMA_BASE_URL (${OLLAMA_BASE_URL}) is not localhost. PHI (transcripts) will be sent to a remote host.`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(msg);
  }
  logger.warn(msg);
}

const buildSoapPrompt = ({ encounterId, transcriptText }: GenerateSoapInput) =>
  [
    "You are a concise clinical summarizer that converts doctor-patient conversation text into a SOAP note.",
    "Use only information present in the transcript; do not invent vitals or labs.",
    `Encounter ID: ${encounterId}`,
    "Transcript:",
    transcriptText,
    "Return JSON matching this exact schema:",
    '{"soap":{"subjective":"string","objective":"string","assessment":"string","plan":"string"},"confidence":0.0,"model_version":"string"}',
    "Keep sections factual and concise.",
  ].join("\n");

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

    const url = `${OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/generate`;
    const prompt = buildSoapPrompt(input);
    logger.debug({ model: OLLAMA_MODEL, encounterId: input.encounterId }, 'OllamaSoapGenerator: sending request');

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json",
      }),
    });
    logger.debug({ status: response.status, encounterId: input.encounterId }, 'OllamaSoapGenerator: response received');

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { response?: unknown };
    const output = normalizeSoapOutput(data.response);
    return SoapSchema.parse(output);
  }
}

class HttpEndpointSoapGenerator implements SoapGenerator {
  constructor(private readonly endpoint: string) {}

  async generate(input: GenerateSoapInput): Promise<SoapOutput> {
    logger.debug({ encounterId: input.encounterId }, 'HttpEndpointSoapGenerator: sending request');
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId: input.encounterId,
        transcriptText: input.transcriptText,
      }),
    });
    logger.debug({ status: response.status, encounterId: input.encounterId }, 'HttpEndpointSoapGenerator: response received');
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`External SOAP endpoint failed (${response.status}): ${body}`);
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
