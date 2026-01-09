import { Request, Response, NextFunction } from "express";
import { promises as fs } from "fs";
import path from "path";

const AUDIT_LOG_FILE = path.join(__dirname, '../../audit.log');

const SENSITIVE_QUERY_KEYS = [
  "password",
  "token",
  "authorization",
  "secret",
  "secretkey",
  "accesstoken",
  "idtoken",
  "refreshtoken",
];
const SENSITIVE_BODY_KEYS = [
  "password",
  "token",
  "authorization",
  "secret",
  "secretkey",
  "code",
  "accesstoken",
  "idtoken",
  "refreshtoken",
];

function sanitizeObject<T extends Record<string, any>>(obj: T, sensitiveKeys: string[]) {
  if (!obj) return obj;
  const clone: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      clone[key] = "[redacted]";
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      clone[key] = sanitizeObject(obj[key], sensitiveKeys);
    } else {
      clone[key] = obj[key];
    }
  }
  return clone;
}

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', async () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // duration in ms

    const entry = {
      timestamp: new Date().toISOString(),
      user: req.user?.uid || "anonymous",
      method: req.method,
      url: (req.originalUrl || req.url).split("?")[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      query: sanitizeObject(req.query as Record<string, any>, SENSITIVE_QUERY_KEYS),
      body: sanitizeObject(req.body as Record<string, any>, SENSITIVE_BODY_KEYS),
    };

    const logMessage = JSON.stringify(entry);

    // Log to console for local development
    console.log(`[AUDIT] ${logMessage}`);

    // Append to local audit file
    try {
      await fs.appendFile(AUDIT_LOG_FILE, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to audit log file:', error);
    }

    // Note: Production deployments should integrate with Cloud Logging
    // if (process.env.NODE_ENV === 'production') {
    //   sendToCloudLogging(entry);
    // }
  });

  next();
}
