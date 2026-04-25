import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const level = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

// Masks an email address before logging to prevent PHI exposure in log streams.
// "john.doe@example.com" → "j***@example.com"
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

const errSerializer = (err: unknown) => {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: String(err.message).slice(0, 300) };
};

const getLoggerOptions = () => {
  const base = {
    level,
    serializers: { err: errSerializer },
  };

  if (!isDevelopment) {
    return base;
  }

  try {
    require.resolve("pino-pretty");
    return {
      ...base,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    };
  } catch {
    return base;
  }
};

const logger = pino(getLoggerOptions());

export default logger;
