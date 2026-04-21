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
