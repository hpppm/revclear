import logger from "../../utils/logger";
import { appConfig } from "../../config/appConfig";
import { checkPineconeHealth } from "./pinecone";

export type AiProviderHealth = {
  healthy: boolean;
  message: string;
  configured: boolean;
};

export type AiProviderHealthReport = {
  overallHealthy: boolean;
  model: AiProviderHealth;
  groq: AiProviderHealth;
  whisper: AiProviderHealth;
  pinecone: AiProviderHealth;
};

const checkModelConfig = async (): Promise<AiProviderHealth> => {
  const configured = Boolean(appConfig.ai.geminiApiKey && appConfig.ai.geminiModel);
  return {
    configured,
    healthy: configured,
    message: configured
      ? `Genkit model configured (${appConfig.ai.geminiModel})`
      : "Gemini model configuration is missing",
  };
};

const checkWhisperHealth = async (): Promise<AiProviderHealth> => {
  const transcribeUrl = appConfig.ai.transcribeUrl;
  if (!transcribeUrl) {
    return { configured: false, healthy: false, message: "AI_TRANSCRIBE_URL not configured" };
  }
  const healthUrl = transcribeUrl.replace(/\/transcribe\/?$/, "/health");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok
      ? { configured: true, healthy: true, message: "Whisper service reachable" }
      : { configured: true, healthy: false, message: `Whisper service returned ${res.status}` };
  } catch (err: any) {
    return { configured: true, healthy: false, message: `Whisper unreachable (${err?.message ?? "error"})` };
  }
};

const checkGroqConfig = (): AiProviderHealth => {
  const configured = Boolean(appConfig.ai.groqApiKey && appConfig.ai.groqModel);
  return {
    configured,
    healthy: configured,
    message: configured
      ? `Groq fallback configured (${appConfig.ai.groqModel})`
      : "Groq not configured — fallback unavailable if Gemini fails",
  };
};

export const getAiProviderHealthReport = async (): Promise<AiProviderHealthReport> => {
  const [model, pinecone, whisper] = await Promise.all([
    checkModelConfig(),
    checkPineconeHealth(),
    checkWhisperHealth(),
  ]);
  const groq = checkGroqConfig();

  return {
    overallHealthy: model.healthy && pinecone.healthy && whisper.healthy,
    model,
    groq,
    whisper,
    pinecone: {
      healthy: pinecone.healthy,
      configured: Boolean(appConfig.ai.pinecone.apiKey && appConfig.ai.pinecone.indexHost),
      message: pinecone.message,
    },
  };
};

export const logAiProviderHealthStartup = async () => {
  const report = await getAiProviderHealthReport();
  const logFn = report.overallHealthy ? logger.info.bind(logger) : logger.warn.bind(logger);
  if (!report.groq.healthy) {
    logger.warn({ message: report.groq.message }, "AI provider health: groq fallback");
  }
  logFn(
    {
      overall: report.overallHealthy ? "healthy" : "degraded",
      model: { healthy: report.model.healthy, message: report.model.message },
      groq: { healthy: report.groq.healthy, message: report.groq.message },
      whisper: { healthy: report.whisper.healthy, message: report.whisper.message },
      pinecone: { healthy: report.pinecone.healthy, message: report.pinecone.message },
    },
    "AI provider health",
  );
};
