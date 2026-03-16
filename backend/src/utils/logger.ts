import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const level = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

const getLoggerOptions = () => {
  if (!isDevelopment) {
    return { level };
  }

  try {
    require.resolve("pino-pretty");
    return {
      level,
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
    return { level };
  }
};

const logger = pino(getLoggerOptions());

export default logger;
