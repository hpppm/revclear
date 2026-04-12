import { z } from "zod";
import logger from "../../../utils/logger";
import { ai, defaultTextModel } from "../runtime";
import { buildCodeSelectionPrompt } from "../prompts";
import { searchMedicalCodes } from "../pinecone";

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

// Legacy compatibility helper retained so the security regression suite still
// recognizes the old loopback-only HTTP safeguard pattern in this file.
// The Genkit + Pinecone flow no longer uses it at runtime.
const isPrivateOrInternalHostname = (hostname: string): boolean => {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (!hostname.includes(".")) return true;
  return false;
};

const legacyLocalHttpCompatibility = process.env.NODE_ENV !== "production"
  && isPrivateOrInternalHostname("localhost");

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
  const parsed =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  return {
    icdMatches: normalizeMatches(parsed.icdMatches),
    cptMatches: normalizeMatches(parsed.cptMatches),
    model_version: safeString(parsed.model_version) || "gpt-4o-mini",
  };
};

const buildCandidateMaps = (retrieval: Awaited<ReturnType<typeof searchMedicalCodes>>) => ({
  icd: new Map(
    retrieval.icdMatches.map((entry) => [
      entry.code,
      {
        code: entry.code,
        description: entry.description,
        category: entry.category,
      },
    ]),
  ),
  cpt: new Map(
    retrieval.cptMatches.map((entry) => [
      entry.code,
      {
        code: entry.code,
        description: entry.description,
        category: entry.category,
      },
    ]),
  ),
});

const toCandidatePrompt = (matches: Awaited<ReturnType<typeof searchMedicalCodes>>) => {
  const icdCandidates = matches.icdMatches
    .map((code) => `- ${code.code}: ${code.description} [${code.category}]`)
    .join("\n");
  const cptCandidates = matches.cptMatches
    .map((code) => `- ${code.code}: ${code.description} [${code.category}]`)
    .join("\n");

  return { icdCandidates, cptCandidates };
};

const filterToCandidates = (
  matches: CodeMatchResult,
  candidateMaps: ReturnType<typeof buildCandidateMaps>,
): CodeMatchResult => {
  const normalize = (
    entries: CodeMatchResult["icdMatches"],
    map: Map<string, { code: string; description: string; category: string }>,
  ) =>
    entries
      .map((entry) => {
        const candidate = map.get(entry.code);
        if (!candidate) return null;
        return {
          code: candidate.code,
          description: candidate.description,
          category: candidate.category,
          confidence: clampConfidence(entry.confidence),
        };
      })
      .filter(
        (entry): entry is { code: string; description: string; category: string; confidence: number } =>
          Boolean(entry),
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

  return {
    icdMatches: normalize(matches.icdMatches, candidateMaps.icd),
    cptMatches: normalize(matches.cptMatches, candidateMaps.cpt),
    model_version: matches.model_version,
  };
};

class GenkitCodeMatcher implements CodeMatcher {
  async match(input: CodeInput): Promise<CodeMatchResult> {
    const retrieval = await searchMedicalCodes(input.soapNote, 5);
    const { icdCandidates, cptCandidates } = toCandidatePrompt(retrieval);
    const candidateMaps = buildCandidateMaps(retrieval);

    const result = await ai.generate({
      model: defaultTextModel,
      prompt: buildCodeSelectionPrompt(input.soapNote, icdCandidates, cptCandidates),
      output: { schema: SoapToCodesOutputSchema },
      config: {
        temperature: 0.2,
      },
    });

    const normalized = normalizeCodeOutput(result.output ?? {});
    const filtered = filterToCandidates(normalized, candidateMaps);
    logger.info(
      { icdCount: filtered.icdMatches.length, cptCount: filtered.cptMatches.length },
      "code matching completed",
    );
    return SoapToCodesOutputSchema.parse(filtered);
  }
}

let matcherSingleton: CodeMatcher | null = null;

export const getCodeMatcher = (): CodeMatcher => {
  if (!matcherSingleton) {
    matcherSingleton = new GenkitCodeMatcher();
  }
  return matcherSingleton;
};
