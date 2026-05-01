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
  pineconeDegraded: z.boolean().optional(),
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
  return value
    .map((entry) => {
      const e = (entry ?? {}) as Record<string, unknown>;
      return {
        code: safeString(e.code),
        description: safeString(e.description),
        category: safeString(e.category),
        confidence: clampConfidence(e.confidence),
      };
    })
    .filter((m) => m.code !== "" && m.description !== "");
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

const extractAssessmentAndPlan = (soapNote: string): string => {
  const lines = soapNote.split("\n");
  const relevant: string[] = [];
  let capturing = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase().trim();

    // Start capturing on assessment/plan keywords (including indented)
    if (/\b(assessment|plan|diagnosis|impression|clinical impression)\b/i.test(lower)) {
      capturing = true;
      // Add current line if it has content beyond the header
      const content = line.replace(/^.*?:\s*/, "").trim();
      if (content) relevant.push(content);
    } else if (capturing && /^(subjective|objective|s:|o:)/i.test(lower)) {
      // Stop capturing on other SOAP sections
      capturing = false;
    } else if (capturing && line.trim()) {
      // Capture all non-empty lines while in capture mode
      relevant.push(line.trim());
    }
  }

  // Return up to 2000 chars (doubled from 1000) to preserve more context
  return relevant.join(" ").slice(0, 2000);
};

class GenkitCodeMatcher implements CodeMatcher {
  async match(input: CodeInput): Promise<CodeMatchResult> {
    // SECURITY: Scrub structured PHI before sending to external AI endpoint.
    const { scrubbed: scrubbedNote, redactionCount } = scrubPHI(input.soapNote);
    if (redactionCount > 0) {
      logger.info({ redactionCount }, "code-matcher: PHI redacted before AI call");
    }

    // Extract assessment and plan lines for a focused Pinecone query.
    // Full SOAP notes dilute vector similarity — diagnosis/plan sections
    // are what drive ICD and CPT code selection.
    const pineconeQuery = extractAssessmentAndPlan(scrubbedNote) || scrubbedNote;

    let retrieval: Awaited<ReturnType<typeof searchMedicalCodes>>;
    let pineconeDegraded = false;
    try {
      retrieval = await searchMedicalCodes(pineconeQuery, 5);
    } catch (pineconeError) {
      logger.warn({ err: (pineconeError as Error)?.message }, "code-matcher: pinecone search failed, continuing without retrieval");
      retrieval = { icdMatches: [], cptMatches: [] };
      pineconeDegraded = true;
    }


    const pineconeHasResults = retrieval.icdMatches.length > 0 || retrieval.cptMatches.length > 0;
    const { icdCandidates, cptCandidates } = toCandidatePrompt(retrieval);
    const candidateMaps = buildCandidateMaps(retrieval);
    const prompt = buildCodeSelectionPrompt(scrubbedNote, icdCandidates, cptCandidates);

    let rawOutput: unknown;
    let providerUsed: "gemini" | "groq" = "gemini";

    try {
      const AI_TIMEOUT_MS = 25000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI code matching timed out after 25 seconds")), AI_TIMEOUT_MS),
      );
      const generatePromise = ai.generate({
        model: defaultTextModel,
        prompt,
        output: { schema: SoapToCodesOutputSchema },
        config: { temperature: 0.2 },
      });
      const result = await Promise.race([generatePromise, timeoutPromise]);
      rawOutput = result.output ?? {};
    } catch (geminiError) {
      if ((geminiError as Error)?.message === "AI code matching timed out after 25 seconds") {
        throw geminiError;
      }
      logger.warn(
        { provider: "gemini", err: (geminiError as Error)?.message },
        "code-matcher: gemini failed, attempting groq fallback",
      );
      try {
        rawOutput = await callGroqForJson(prompt, { operation: "codes" });
        providerUsed = "groq";
      } catch (groqError) {
        logger.error(
          { provider: "groq", err: (groqError as Error)?.message },
          "code-matcher: groq fallback failed"
        );
        throw new Error("Both Gemini and Groq failed to generate codes");
      }
    }

    const normalized = normalizeCodeOutput(rawOutput);
    // Filter each code type independently against Pinecone candidates.
    // If Pinecone has no results for a type, fall back to raw LLM output for
    // that type so a sparse ICD namespace never silences ICD codes entirely.
    let filtered: CodeMatchResult;
    if (!pineconeHasResults) {
      // No Pinecone results — trust LLM output fully
      filtered = normalized;
      logger.debug({ reason: "no pinecone results" }, "skipping pinecone filtering");
    } else {
      const candidateFiltered = filterToCandidates(normalized, candidateMaps);
      filtered = {
        icdMatches: candidateFiltered.icdMatches.length > 0 ? candidateFiltered.icdMatches : normalized.icdMatches,
        cptMatches: candidateFiltered.cptMatches.length > 0 ? candidateFiltered.cptMatches : normalized.cptMatches,
        model_version: normalized.model_version,
      };
      logger.debug(
        {
          icdFiltered: candidateFiltered.icdMatches.length,
          icdUnfiltered: normalized.icdMatches.length,
          cptFiltered: candidateFiltered.cptMatches.length,
          cptUnfiltered: normalized.cptMatches.length,
        },
        "pinecone filtering results",
      );
    }
    const hasMatches = filtered.icdMatches.length > 0 || filtered.cptMatches.length > 0;
    logger.info(
      {
        icdCount: filtered.icdMatches.length,
        cptCount: filtered.cptMatches.length,
        model: filtered.model_version,
        provider: providerUsed,
        pineconeDegraded,
        hasMatches,
      },
      "code matching completed",
    );
    // Use safeParse so a malformed Groq response never crashes the route —
    // if validation fails, return whatever normalized output we have.
    const parseResult = SoapToCodesOutputSchema.safeParse(filtered);
    const final = parseResult.success ? parseResult.data : filtered;
    return { ...final, pineconeDegraded };
  }
}

let matcherSingleton: CodeMatcher | null = null;

export const getCodeMatcher = (): CodeMatcher => {
  if (!matcherSingleton) {
    matcherSingleton = new GenkitCodeMatcher();
  }
  return matcherSingleton;
};
