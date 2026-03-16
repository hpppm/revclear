import logger from "../../utils/logger";

export type AiServerHealth = {
  healthy: boolean;
  message: string;
  statusCode?: number;
};

export type AiProviderHealthReport = {
  overallHealthy: boolean;
  aiServerHealthUrl: string;
  aiServer: AiServerHealth;
};

const SOAP_API_URL = process.env.SOAP_API_URL || "";
const CODES_API_URL = process.env.CODES_API_URL || "";
const TRANSCRIBE_API_URL =
  process.env.AI_TRANSCRIBE_URL ||
  process.env.TRANSCRIBE_API_URL ||
  process.env.TRANSCRIBE_URL ||
  "";
const AI_SERVER_API_KEY = process.env.AI_SERVER_API_KEY || "";
const AI_SERVER_HEALTH_URL = process.env.AI_SERVER_HEALTH_URL || "";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const createTimeoutSignal = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

type AiServerCheck = {
  reachable: boolean;
  statusCode?: number;
  message: string;
};

const resolveAiServerHealthUrl = (): string => {
  if (AI_SERVER_HEALTH_URL) return AI_SERVER_HEALTH_URL;

  const candidateUrl = SOAP_API_URL || CODES_API_URL || TRANSCRIBE_API_URL;
  if (!candidateUrl) return "";

  try {
    const parsed = new URL(candidateUrl);
    const pathname = parsed.pathname || "";
    parsed.pathname = pathname.startsWith("/api/") ? "/api/health" : "/health";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const checkAiServer = async (url: string): Promise<AiServerCheck> => {
  const { signal, done } = createTimeoutSignal(4000);

  try {
    if (!url) {
      return {
        reachable: false,
        message: "AI server health URL is not configured",
      };
    }

    const headers: Record<string, string> = {};
    if (AI_SERVER_API_KEY) {
      headers["X-API-Key"] = AI_SERVER_API_KEY;
    }

    const response = await fetch(url, { signal, headers });
    if (!response.ok) {
      return {
        reachable: false,
        statusCode: response.status,
        message: `AI server health check responded with HTTP ${response.status}`,
      };
    }

    return {
      reachable: true,
      statusCode: response.status,
      message: "AI server health route is reachable",
    };
  } catch (error: any) {
    return {
      reachable: false,
      message: `AI server unreachable (${error?.name || "error"})`,
    };
  } finally {
    done();
  }
};

export const getAiProviderHealthReport = async (): Promise<AiProviderHealthReport> => {
  const aiServerHealthUrl = resolveAiServerHealthUrl();
  const aiServerCheck = await checkAiServer(aiServerHealthUrl);
  const hasConfiguredAiEndpoint = Boolean(
    SOAP_API_URL || CODES_API_URL || TRANSCRIBE_API_URL,
  );
  const aiServer: AiServerHealth = !hasConfiguredAiEndpoint
    ? {
        healthy: false,
        message: "No AI server endpoints are configured",
      }
    : {
        healthy: aiServerCheck.reachable,
        message: aiServerCheck.message,
        statusCode: aiServerCheck.statusCode,
      };

  return {
    overallHealthy: aiServer.healthy,
    aiServerHealthUrl,
    aiServer,
  };
};

export const logAiProviderHealthStartup = async () => {
  const report = await getAiProviderHealthReport();
  const logFn = report.overallHealthy ? logger.info.bind(logger) : logger.warn.bind(logger);
  logFn(
    {
      overall: report.overallHealthy ? 'healthy' : 'degraded',
      aiServerHealthUrl: report.aiServerHealthUrl,
      aiServer: {
        healthy: report.aiServer.healthy,
        statusCode: report.aiServer.statusCode,
      },
    },
    'AI server health',
  );
};
