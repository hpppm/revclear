import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { appConfig } from "../../config/appConfig";

const modelName = appConfig.ai.geminiModel || "gemini-2.5-flash";

export const ai = genkit({
  plugins: [googleAI({ apiKey: appConfig.ai.geminiApiKey || "" })],
});

export const defaultTextModel = googleAI.model(modelName);
