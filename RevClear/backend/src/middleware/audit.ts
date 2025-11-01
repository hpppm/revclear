import { Request, Response, NextFunction } from "express";
import { Logging } from "@google-cloud/logging";

// Initialize Cloud Logging client
const logging = new Logging({
  projectId: process.env.GCP_PROJECT_ID,
});

// Create a log with HIPAA-compliant audit trail settings
const log = logging.log('revclear-audit');

// Define severity levels for Cloud Logging
const SEVERITY = {
  DEFAULT: 'DEFAULT',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
  ALERT: 'ALERT',
  EMERGENCY: 'EMERGENCY',
};

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', async () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // duration in ms

    // Prepare audit entry with HIPAA-required fields
    const auditEntry = {
      timestamp: new Date().toISOString(),
      user: req.user?.uid || "anonymous",
      method: req.method,
      url: req.url,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      // Additional HIPAA audit fields
      action: `${req.method} ${req.url}`,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      sessionId: req.headers['x-session-id'] || null,
    };

    // Determine severity based on status code
    let severity = SEVERITY.INFO;
    if (res.statusCode >= 500) {
      severity = SEVERITY.ERROR;
    } else if (res.statusCode >= 400) {
      severity = SEVERITY.WARNING;
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      severity = SEVERITY.INFO;
    }

    // Log to console for local development
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);

    // Write to Cloud Logging
    try {
      const metadata = {
        severity: severity,
        resource: {
          type: 'cloud_run_revision',
          labels: {
            service_name: 'revclear-backend',
            revision_name: process.env.K_REVISION || 'local',
            location: process.env.GCP_REGION || 'us-central1',
          },
        },
        labels: {
          environment: process.env.NODE_ENV || 'development',
          userId: auditEntry.user,
          httpMethod: req.method,
          httpStatusCode: res.statusCode.toString(),
        },
      };

      const entry = log.entry(metadata, auditEntry);
      await log.write(entry);
    } catch (error) {
      console.error('Failed to write to Cloud Logging:', error);
      // Don't fail the request if logging fails, but alert monitoring
      // In production, you might want to send this to a dead letter queue
    }
  });

  next();
}