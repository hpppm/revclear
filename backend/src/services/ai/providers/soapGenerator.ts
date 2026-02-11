import { z } from "zod";

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
    console.log(
      `[OllamaSoapGenerator] Sending request to ${url} using model=${OLLAMA_MODEL} encounter=${input.encounterId}`
    );

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
    console.log(
      `[OllamaSoapGenerator] Response status=${response.status} encounter=${input.encounterId}`
    );

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
    console.log(
      `[HttpEndpointSoapGenerator] Sending request to ${this.endpoint} encounter=${input.encounterId}`
    );
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId: input.encounterId,
        transcriptText: input.transcriptText,
      }),
    });
    console.log(
      `[HttpEndpointSoapGenerator] Response status=${response.status} encounter=${input.encounterId}`
    );
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
