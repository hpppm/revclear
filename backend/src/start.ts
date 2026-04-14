import app from "./server";
import { appConfig } from "./config/appConfig";
import { closePool } from "./config/db";
import { logAiProviderHealthStartup } from "./services/ai/providerHealth";
import logger from "./utils/logger";

const PORT = appConfig.port;
const disableListen = appConfig.disableListen;
const isTestEnv = appConfig.env === "test" || process.env.JEST_WORKER_ID;

let server: any;

if (!isTestEnv && !disableListen) {
  server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'API server started');
    void logAiProviderHealthStartup();
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
