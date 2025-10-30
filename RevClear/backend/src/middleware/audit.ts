import { Request, Response, NextFunction } from "express";
import { promises as fs } from "fs";
import path from "path";

const AUDIT_LOG_FILE = path.join(__dirname, '../../audit.log');

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', async () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // duration in ms

    const entry = {
      timestamp: new Date().toISOString(),
      user: req.user?.uid || "anonymous",
      method: req.method,
      url: req.url,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      // Add more details as needed, e.g., request body (careful with PHI)
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

    // TODO: Integrate with Cloud Logging for production deployments
    // if (process.env.NODE_ENV === 'production') {
    //   sendToCloudLogging(entry);
    // }
  });

  next();
}