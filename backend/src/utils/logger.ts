import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

const logger = pino(
  isDevelopment
    ? {
        level,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : { level },
);

export default logger;
