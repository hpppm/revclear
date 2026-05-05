import app from "./server";
import { appConfig } from "./config/appConfig";
import { closePool } from "./config/db";
import { logAiProviderHealthStartup } from "./services/ai/providerHealth";
import { ensurePineconeMedicalCodeIndex } from "./services/ai/pinecone";
import { warmupGemini } from "./services/ai/runtime";
import logger from "./utils/logger";

const PORT = appConfig.port;
const disableListen = appConfig.disableListen;
const isTestEnv = appConfig.env === "test" || process.env.JEST_WORKER_ID;

let server: any;

if (!isTestEnv && !disableListen) {
  server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'API server started');
    if (!appConfig.ai.groqApiKey) {
      logger.warn("GROQ_API_KEY not set — Groq fallback unavailable if Gemini fails");
    }
    void logAiProviderHealthStartup();
    void warmupGemini().then(() =>
      logger.info("Gemini connection warmup completed")
    ).catch((err) =>
      logger.warn({ err }, "Gemini warmup failed — first request may be slower")
    );
    void (async () => {
      const maxAttempts = 3;
      const retryDelayMs = 2000;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await ensurePineconeMedicalCodeIndex();
          logger.info({ attempt }, "Pinecone code index warmup succeeded");
          return;
        } catch (error) {
          logger.warn({ err: error, attempt, maxAttempts }, "Pinecone code index warmup failed");
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
        }
      }
      logger.error("Pinecone code index warmup failed after all attempts — first requests may return empty results");
    })();
  });
} else {
  logger.debug('Server listen disabled (test or DISABLE_LISTEN)');
}

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully');
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
  try {
    await closePool();
  } catch (err) {
    logger.error({ err }, 'Error closing DB pool during shutdown');
  } finally {
    process.exit(0);
  }
};

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig as NodeJS.Signals, () => shutdown(sig))
);
