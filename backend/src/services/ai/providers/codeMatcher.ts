import { z } from "zod";
import logger from "../../../utils/logger";
import { ai, defaultTextModel } from "../runtime";
import { buildCodeSelectionPrompt } from "../prompts";
import { searchMedicalCodes } from "../pinecone";
import { appConfig } from "../../../config/appConfig";
import { scrubPHI } from "../../../utils/textScrubber";
import { callGroqForJson } from "./groqFallback";

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
    model_version: safeString(parsed.model_version) || appConfig.ai.geminiModel,
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
    // SECURITY: Scrub structured PHI before sending to external AI endpoint.
    const { scrubbed: scrubbedNote, redactionCount } = scrubPHI(input.soapNote);
    if (redactionCount > 0) {
      logger.info({ redactionCount }, "code-matcher: PHI redacted before AI call");
    }

    let retrieval: Awaited<ReturnType<typeof searchMedicalCodes>>;
    try {
      retrieval = await searchMedicalCodes(scrubbedNote, 5);
    } catch (pineconeError) {
      logger.warn({ err: (pineconeError as Error)?.message }, "code-matcher: pinecone search failed, continuing without retrieval");
      retrieval = { icdMatches: [], cptMatches: [] };
    }

    const pineconeHasResults = retrieval.icdMatches.length > 0 || retrieval.cptMatches.length > 0;
    const { icdCandidates, cptCandidates } = toCandidatePrompt(retrieval);
    const candidateMaps = buildCandidateMaps(retrieval);
    const prompt = buildCodeSelectionPrompt(scrubbedNote, icdCandidates, cptCandidates);

    let rawOutput: unknown;
    let providerUsed: "gemini" | "groq" = "gemini";

    try {
      const result = await ai.generate({
        model: defaultTextModel,
        prompt,
        output: { schema: SoapToCodesOutputSchema },
        config: { temperature: 0.2 },
      });
      rawOutput = result.output ?? {};
    } catch (geminiError) {
      logger.warn(
        { provider: "gemini", err: (geminiError as Error)?.message },
        "code-matcher: gemini failed, attempting groq fallback",
      );
      rawOutput = await callGroqForJson(prompt, { operation: "codes" });
      providerUsed = "groq";
    }

    const normalized = normalizeCodeOutput(rawOutput);
    // Use Pinecone candidates to re-rank/validate when available, but fall back
    // to raw LLM output when the catalog is too small to cover the encounter.
    const candidateFiltered = pineconeHasResults ? filterToCandidates(normalized, candidateMaps) : null;
    const hasCandidateResults =
      candidateFiltered &&
      (candidateFiltered.icdMatches.length > 0 || candidateFiltered.cptMatches.length > 0);
    const filtered = hasCandidateResults ? candidateFiltered : normalized;
    logger.info(
      {
        icdCount: filtered.icdMatches.length,
        cptCount: filtered.cptMatches.length,
        model: filtered.model_version,
        provider: providerUsed,
      },
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
