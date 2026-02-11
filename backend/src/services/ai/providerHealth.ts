type ProviderMode = "ollama" | "external";

export type ProviderHealth = {
  mode: ProviderMode;
  healthy: boolean;
  message: string;
};

export type AiProviderHealthReport = {
  overallHealthy: boolean;
  ollamaBaseUrl: string;
  soap: ProviderHealth;
  codes: ProviderHealth;
};

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;

const SOAP_API_URL = process.env.SOAP_API_URL || "";
const CODES_API_URL = process.env.CODES_API_URL || "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "";
const OLLAMA_CODES_MODEL = process.env.OLLAMA_CODES_MODEL || OLLAMA_MODEL;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const createTimeoutSignal = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

type OllamaCheck = {
  reachable: boolean;
  installedModels: string[];
  missingModels: string[];
  message: string;
};

const checkOllamaModels = async (models: string[]) => {
  const url = `${trimTrailingSlash(OLLAMA_BASE_URL)}/api/tags`;
  const { signal, done } = createTimeoutSignal(4000);

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return {
        reachable: false,
        installedModels: [] as string[],
        missingModels: models,
        message: `Ollama responded with HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      models?: Array<{ name?: string; model?: string }>;
    };
    const installedModels = (payload.models || [])
      .map((m) => (typeof m.name === "string" ? m.name : m.model || ""))
      .filter((name) => name.length > 0);

    const missingModels = models.filter((m) => !installedModels.includes(m));
    return {
      reachable: true,
      installedModels,
      missingModels,
      message:
        missingModels.length === 0
          ? "Ollama reachable and all configured models are installed"
          : `Ollama reachable but missing models: ${missingModels.join(", ")}`,
    };
  } catch (error: any) {
    return {
      reachable: false,
      installedModels: [] as string[],
      missingModels: models,
      message: `Ollama unreachable (${error?.name || "error"})`,
    };
  } finally {
    done();
  }
};

export const getAiProviderHealthReport = async (): Promise<AiProviderHealthReport> => {
  const soapMode: ProviderMode = SOAP_API_URL ? "external" : "ollama";
  const codesMode: ProviderMode = CODES_API_URL ? "external" : "ollama";

  const modelsToCheck = new Set<string>();
  if (soapMode === "ollama" && OLLAMA_MODEL) modelsToCheck.add(OLLAMA_MODEL);
  if (codesMode === "ollama" && OLLAMA_CODES_MODEL) modelsToCheck.add(OLLAMA_CODES_MODEL);

  const ollamaCheck: OllamaCheck =
    modelsToCheck.size > 0
      ? await checkOllamaModels([...modelsToCheck])
      : {
          reachable: true,
          installedModels: [],
          missingModels: [],
          message: "No Ollama-backed providers configured",
        };

  const isModelHealthy = (model: string) =>
    ollamaCheck.reachable && !ollamaCheck.missingModels.includes(model);

  const soap: ProviderHealth =
    soapMode === "external"
      ? {
          mode: "external",
          healthy: true,
          message: `External SOAP endpoint configured: ${SOAP_API_URL}`,
        }
      : !OLLAMA_MODEL
        ? {
            mode: "ollama",
            healthy: false,
            message: "OLLAMA_MODEL is not set",
          }
        : {
            mode: "ollama",
            healthy: isModelHealthy(OLLAMA_MODEL),
            message: ollamaCheck.reachable
              ? ollamaCheck.message
              : `Ollama unavailable at ${OLLAMA_BASE_URL}`,
          };

  const codes: ProviderHealth =
    codesMode === "external"
      ? {
          mode: "external",
          healthy: true,
          message: `External codes endpoint configured: ${CODES_API_URL}`,
        }
      : !OLLAMA_CODES_MODEL
        ? {
            mode: "ollama",
            healthy: false,
            message: "OLLAMA_CODES_MODEL/OLLAMA_MODEL is not set",
          }
        : {
            mode: "ollama",
            healthy: isModelHealthy(OLLAMA_CODES_MODEL),
            message: ollamaCheck.reachable
              ? ollamaCheck.message
              : `Ollama unavailable at ${OLLAMA_BASE_URL}`,
          };

  return {
    overallHealthy: soap.healthy && codes.healthy,
    ollamaBaseUrl: OLLAMA_BASE_URL,
    soap,
    codes,
  };
};

export const logAiProviderHealthStartup = async () => {
  const report = await getAiProviderHealthReport();

  const badge = report.overallHealthy ? "✅" : "⚠️";
  console.log(
    `${badge} AI provider health: overall=${report.overallHealthy ? "healthy" : "degraded"} ollama=${report.ollamaBaseUrl}`
  );
  console.log(
    `[AI Health] SOAP mode=${report.soap.mode} healthy=${report.soap.healthy} message="${report.soap.message}"`
  );
  console.log(
    `[AI Health] CODES mode=${report.codes.mode} healthy=${report.codes.healthy} message="${report.codes.message}"`
  );
};
