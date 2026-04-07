import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import logger from "../utils/logger";

const AUDIT_LOG_FILE = path.join(__dirname, '../../audit.log');
const isProduction = process.env.NODE_ENV === "production";
const enableAuditFileLogging =
  !isProduction || process.env.AUDIT_FILE_LOGGING === "true";

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
  "email",
  "phone",
  "dob",
  "member_id",
  "insurance_id",
];

// Request body sensitive keys (auth + PHI/PII)
// HIPAA 45 CFR § 164.312(b): PHI must never appear in application logs.
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
  // PHI — patient identity
  "name",
  "full_name",
  "fullname",
  "first_name",
  "last_name",
  "firstname",
  "lastname",
  "email",
  "gender",
  "ssn",
  "social_security",
  "socialsecurity",
  "social_security_number",
  "dob",
  "date_of_birth",
  "dateofbirth",
  "birthdate",
  "birth_date",
  // PHI — contact / address
  "address",
  "address_street",
  "address_line1",
  "address_line2",
  "address_city",
  "address_state",
  "address_zip",
  "city",
  "state",
  "postal_code",
  "zip",
  "phone",
  "phone_number",
  "fax",
  // PHI — insurance / billing
  "insurance_id",
  "insuranceid",
  "insurance_provider",
  "insuranceprovider",
  "insurance_policy_number",
  "insurance_member_id",
  "insurance_group_number",
  "insurance_payer_id",
  "insurance_payer_name",
  "insurance_relationship",
  "subscriber_id",
  "subscriberid",
  "subscriber",
  "subscriber_relationship",
  "subscriber_name",
  "member_id",
  "memberid",
  "plan_name",
  "npi",
  "tax_id",
  "taxid",
  // PHI — clinical content
  "diagnosis",
  "diagnoses",
  "diagnosis_codes",
  "procedure_codes",
  "chief_complaint",
  "chiefcomplaint",
  "medical_record",
  "medicalrecord",
  "mrn",
  "patient",
  "patient_id",
  "patient_name",
  "claim",
  "claim_id",
  "claim_type",
  "billing_provider",
  "service_facility",
  "rendering_provider",
  "line_items",
  "input_json",
  "output_json",
  "transcript",
  "soap",
  "soap_note",
  "soapnote",
  "subjective",
  "objective",
  "assessment",
  "plan",
  "notes",
  "clinical_notes",
  "clinicalnotes",
];

// Fields that should be partially masked (show last 4 chars)
const PARTIAL_MASK_KEYS = ["phone", "phone_number", "phonenumber", "fax"];

// UUIDs in URLs and query params can be used to enumerate patient records.
// HIPAA 45 CFR § 164.312(b): resource identifiers that link to PHI must not
// appear in cleartext in audit logs.
const UUID_URL_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const UUID_VALUE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Replace UUID path segments with [id] so patient/encounter/claim record IDs
// do not appear in cleartext in audit logs.
// Input:  "/api/patients/d0e15346-304e-4220-9ea5-04a4879c6fa8"
// Output: "/api/patients/[id]"
function maskUrlUuids(url: string): string {
  return url.replace(UUID_URL_PATTERN, "[id]");
}

// SECURITY: Mask the Cognito issuer URL to hide AWS region + User Pool ID.
// Input:  "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_NZCFuSv1l"
// Output: "cognito-idp.us-east-1.amazonaws.com/***"
function maskTokenIssuer(iss: string | null | undefined): string | null {
  if (!iss) return null;
  try {
    const url = new URL(iss);
    return `${url.hostname}/***`;
  } catch {
    return "***";
  }
}

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
    } else if (typeof obj[key] === "string" && UUID_VALUE_PATTERN.test(obj[key] as string)) {
      // Mask UUID values — they are record IDs that can be used to enumerate PHI
      clone[key] = "[REDACTED]";
    } else {
      clone[key] = obj[key];
    }
  }
  return clone;
}

function sanitizeAuditBody(body: Record<string, any> | undefined) {
  if (!body || Object.keys(body).length === 0) {
    return {};
  }

  if (isProduction) {
    return "[OMITTED]";
  }

  return sanitizeObject(body, SENSITIVE_BODY_KEYS, PARTIAL_MASK_KEYS);
}

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', async () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // duration in ms

    const auth = (req as any).auth;
    const timestamp = new Date().toISOString();
    // UUID segments replaced with [id] — req.originalUrl is not modified
    const url = maskUrlUuids((req.originalUrl || req.url).split("?")[0]);

    // GENERAL log — written to application stdout (CloudWatch, ECS, etc.).
    // Must contain NO PHI, NO internal IDs, NO credential fields.
    const generalEntry = {
      timestamp,
      method: req.method,
      url,
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      ipAddress: req.ip,
    };

    // AUDIT log — written to secure audit file only.
    // Contains correlation IDs for security investigation but NEVER PHI body content.
    const auditEntry = {
      timestamp,
      // Application-level user ID for data access tracing
      userId: req.user?.id || "anonymous",
      // Cognito sub for cross-system / cross-session correlation
      cognitoSub: auth?.sub || null,
      // jti hashed: enables token replay detection without exposing the raw token ID
      tokenJti: auth?.jti ? createHash('sha256').update(auth.jti).digest('hex').slice(0, 16) : null,
      // Issuer masked: hides AWS region + User Pool ID from logs
      tokenIssuer: maskTokenIssuer(auth?.iss),
      method: req.method,
      url,
      ipAddress: req.ip,
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      query: sanitizeObject(req.query as Record<string, any>, SENSITIVE_QUERY_KEYS),
      body: sanitizeAuditBody(req.body as Record<string, any> | undefined),
    };

    const auditLogMessage = JSON.stringify(auditEntry);

    // Emit general (PHI-free) entry to application logger (stdout / log aggregator)
    if (!isProduction) {
      logger.debug({ audit: auditEntry }, 'audit');
    } else {
      logger.info(generalEntry, 'request');
    }

    // Local file logging is disabled in production by default.
    if (enableAuditFileLogging) {
      try {
        await fs.appendFile(AUDIT_LOG_FILE, auditLogMessage + '\n');
      } catch (error) {
        // Silent fail - don't expose file system errors
      }
    }
  });

  next();
}
