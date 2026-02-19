import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import logger from "../utils/logger";

// Auth/token related keys
const SENSITIVE_QUERY_KEYS = [
  "password",
  "token",
  "authorization",
  "secret",
  "secretkey",
  "accesstoken",
  "idtoken",
  "refreshtoken",
  "apikey",
  "api_key",
];

// Request body sensitive keys (auth + PHI/PII)
const SENSITIVE_BODY_KEYS = [
  // Auth/credentials
  "password",
  "token",
  "authorization",
  "secret",
  "secretkey",
  "code",
  "accesstoken",
  "idtoken",
  "refreshtoken",
  "apikey",
  "api_key",
  // PHI/PII fields - HIPAA compliance
  "ssn",
  "social_security",
  "socialsecurity",
  "social_security_number",
  "insurance_id",
  "insuranceid",
  "member_id",
  "memberid",
  "dob",
  "date_of_birth",
  "dateofbirth",
  "birthdate",
  "birth_date",
  "diagnosis",
  "diagnoses",
  "diagnosis_codes",
  "procedure_codes",
  "medical_record",
  "medicalrecord",
  "mrn",
  "transcript",
  "soap",
  "soap_note",
  "subjective",
  "objective",
  "assessment",
  "plan",
  "notes",
  "clinical_notes",
];

// Fields that should be partially masked (show last 4 chars)
const PARTIAL_MASK_KEYS = ["phone", "phone_number", "phonenumber", "fax"];

function sanitizeObject<T extends Record<string, any>>(obj: T, sensitiveKeys: string[], partialMaskKeys: string[] = []) {
  if (!obj) return obj;
  const clone: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.includes(lowerKey)) {
      clone[key] = "[REDACTED]";
    } else if (partialMaskKeys.includes(lowerKey) && typeof obj[key] === "string") {
      const val = obj[key] as string;
      clone[key] = val.length > 4 ? "****" + val.slice(-4) : "[REDACTED]";
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      clone[key] = sanitizeObject(obj[key], sensitiveKeys, partialMaskKeys);
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
    const durationMs = Number(end - start) / 1_000_000;

    const sanitizedQuery = sanitizeObject(req.query as Record<string, any>, SENSITIVE_QUERY_KEYS);
    const sanitizedBody  = sanitizeObject(req.body  as Record<string, any>, SENSITIVE_BODY_KEYS, PARTIAL_MASK_KEYS);

    const entry = {
      timestamp:   new Date().toISOString(),
      userId:      req.user?.id || null,
      method:      req.method,
      url:         (req.originalUrl || req.url).split("?")[0],
      ipAddress:   req.ip || null,
      statusCode:  res.statusCode,
      durationMs:  parseFloat(durationMs.toFixed(2)),
      queryParams: sanitizedQuery,
      bodySummary: sanitizedBody,
    };

    // Primary: write to api_audit_log table
    try {
      await query(
        `INSERT INTO api_audit_log
           (user_id, method, url, ip_address, status_code, duration_ms, query_params, body_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.userId,
          entry.method,
          entry.url,
          entry.ipAddress,
          entry.statusCode,
          entry.durationMs,
          Object.keys(sanitizedQuery).length ? sanitizedQuery : null,
          Object.keys(sanitizedBody).length  ? sanitizedBody  : null,
        ],
      );
    } catch (dbErr) {
      // Do not expose DB errors; log minimally so the audit failure is visible
      logger.error({ method: entry.method, url: entry.url }, 'audit: failed to write to api_audit_log');
    }

    if (process.env.NODE_ENV === 'development') {
      logger.debug({ audit: entry }, 'audit');
    }
  });

  next();
}
