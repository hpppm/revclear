import { Request, Response, NextFunction } from "express";
import { promises as fs } from "fs";
import path from "path";
import logger from "../utils/logger";

const AUDIT_LOG_FILE = path.join(__dirname, '../../audit.log');

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
    const duration = Number(end - start) / 1_000_000; // duration in ms

    const auth = (req as any).auth;

    const entry = {
      timestamp: new Date().toISOString(),
      // Database user ID for application-level tracing
      userId: req.user?.id || "anonymous",
      // Cognito sub for cross-system / cross-session correlation
      cognitoSub: auth?.sub || null,
      // jti allows detection of token replay across different IPs
      tokenJti: auth?.jti || null,
      // Issuer confirms which user pool issued the token
      tokenIssuer: auth?.iss || null,
      method: req.method,
      url: (req.originalUrl || req.url).split("?")[0],
      ipAddress: req.ip,
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      query: sanitizeObject(req.query as Record<string, any>, SENSITIVE_QUERY_KEYS),
      body: sanitizeObject(req.body as Record<string, any>, SENSITIVE_BODY_KEYS, PARTIAL_MASK_KEYS),
    };

    const logMessage = JSON.stringify(entry);

    // Always emit through structured logger so production stdout (CloudWatch,
    // ECS log driver, etc.) captures every audit event, not just dev.
    if (process.env.NODE_ENV === 'development') {
      logger.debug({ audit: entry }, 'audit');
    } else {
      logger.info({ audit: entry }, 'audit');
    }

    // Also append to local audit file
    try {
      await fs.appendFile(AUDIT_LOG_FILE, logMessage + '\n');
    } catch (error) {
      // Silent fail - don't expose file system errors
    }
  });

  next();
}
