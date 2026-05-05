import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import Groq from "groq-sdk";
import { appConfig } from "../../config/appConfig";

const modelName = appConfig.ai.geminiModel || "gemini-2.5-flash";

export const ai = genkit({
  plugins: [googleAI({ apiKey: appConfig.ai.geminiApiKey || "" })],
});

export const defaultTextModel = googleAI.model(modelName);

let groqClientSingleton: Groq | null = null;

export const getGroqClient = (): Groq | null => {
  const apiKey = appConfig.ai.groqApiKey;
  if (!apiKey) return null;
  if (!groqClientSingleton) {
    groqClientSingleton = new Groq({ apiKey });
  }
  return groqClientSingleton;
};

export const groqFallbackModel = appConfig.ai.groqModel;

// Fires a single cheap generate call to warm up the Genkit/Gemini HTTP connection.
// Without this, the first real user request pays the cold-start cost (~10-15s)
// which can push it over AI_TIMEOUT_MS and cause a visible error.
export const warmupGemini = async (): Promise<void> => {
  try {
    await ai.generate({
      model: defaultTextModel,
      prompt: "Reply with the single word: ready",
      config: { temperature: 0, maxOutputTokens: 5 },
    });
  } catch {
    // Warmup failure is non-fatal — log and continue
  }
};
