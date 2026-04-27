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
  assemblyai: AiProviderHealth;
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

const checkAssemblyAiConfig = async (): Promise<AiProviderHealth> => {
  const configured = Boolean(appConfig.ai.assemblyAiApiKey);
  if (!configured) {
    return {
      configured: false,
      healthy: false,
      message: "ASSEMBLY_TRANSCRIPTION_API_KEY not configured",
    };
  }
  return {
    configured: true,
    healthy: true,
    message: appConfig.ai.assemblyAiMedicalMode
      ? "AssemblyAI configured (medical mode)"
      : "AssemblyAI configured",
  };
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
  const [model, pinecone, assemblyai] = await Promise.all([
    checkModelConfig(),
    checkPineconeHealth(),
    checkAssemblyAiConfig(),
  ]);
  const groq = checkGroqConfig();

  return {
    overallHealthy: model.healthy && pinecone.healthy && assemblyai.healthy,
    model,
    groq,
    assemblyai,
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
      assemblyai: { healthy: report.assemblyai.healthy, message: report.assemblyai.message },
      pinecone: { healthy: report.pinecone.healthy, message: report.pinecone.message },
    },
    "AI provider health",
  );
};
