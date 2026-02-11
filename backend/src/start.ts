import app from "./server";
import { appConfig } from "./config/appConfig";
import { closePool } from "./config/db";
import { logAiProviderHealthStartup } from "./services/ai/providerHealth";

const PORT = appConfig.port;
const disableListen = appConfig.disableListen;
const isTestEnv = appConfig.env === "test" || process.env.JEST_WORKER_ID;

let server: any;

if (!isTestEnv && !disableListen) {
  server = app.listen(PORT, () => {
    console.log(`✅ API running securely on http://localhost:${PORT}`);
    void logAiProviderHealthStartup();
  });
} else {
  console.log("ℹ️ Server listen disabled (test or DISABLE_LISTEN).");
}

const shutdown = async (signal: string) => {
  console.log(`ℹ️ Received ${signal}, shutting down gracefully...`);
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
  try {
    await closePool();
  } catch (err) {
    console.error("⚠️ Error closing DB pool during shutdown", err);
  } finally {
    process.exit(0);
  }
};

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig as NodeJS.Signals, () => shutdown(sig))
);
