/**
 * Safe logger utility for frontend
 * Only logs in development mode to prevent PHI/PII leakage in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Serialize errors so Axios errors (which have non-enumerable properties)
// don't log as empty objects {}.
function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    const axiosErr = err as any;
    return {
      message: err.message,
      ...(axiosErr.response && {
        status: axiosErr.response.status,
        data: axiosErr.response.data,
      }),
      stack: err.stack,
    };
  }
  return err;
}

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args.map((a) => (a instanceof Error ? serializeError(a) : a)));
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

export default logger;
