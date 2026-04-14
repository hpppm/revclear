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

export const getAiProviderHealthReport = async (): Promise<AiProviderHealthReport> => {
  const [model, pinecone] = await Promise.all([
    checkModelConfig(),
    checkPineconeHealth(),
  ]);

  return {
    overallHealthy: model.healthy && pinecone.healthy,
    model,
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
  logFn(
    {
      overall: report.overallHealthy ? "healthy" : "degraded",
      model: {
        healthy: report.model.healthy,
        message: report.model.message,
      },
      pinecone: {
        healthy: report.pinecone.healthy,
        message: report.pinecone.message,
      },
    },
    "AI provider health",
  );
};
