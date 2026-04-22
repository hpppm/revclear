import { getGroqClient, groqFallbackModel } from "../runtime";
import logger from "../../../utils/logger";

type GroqFallbackContext = {
  operation: "soap" | "codes";
  encounterId?: string;
};

/**
 * Calls Groq chat completions in JSON mode and returns the parsed object.
 * SECURITY: callers MUST pass already-PHI-scrubbed prompt text.
 * Never logs prompt or response body — only metadata.
 */
export const callGroqForJson = async (
  prompt: string,
  ctx: GroqFallbackContext,
): Promise<unknown> => {
  const client = getGroqClient();
  if (!client) {
    throw new Error("GROQ_API_KEY not configured — fallback unavailable");
  }

  const completion = await client.chat.completions.create({
    model: groqFallbackModel,
    messages: [
      {
        role: "system",
        content:
          "You are a medical-coding assistant. Respond with JSON only. " +
          "Do not include prose, markdown fences, or commentary.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";
  // Strip accidental markdown fences before parsing
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    logger.info(
      { provider: "groq", operation: ctx.operation, encounterId: ctx.encounterId },
      "ai fallback: groq call succeeded",
    );
    return parsed;
  } catch {
    logger.error(
      { provider: "groq", operation: ctx.operation, encounterId: ctx.encounterId },
      "ai fallback: groq returned non-JSON response",
    );
    throw new Error("Groq returned non-JSON response");
  }
};
