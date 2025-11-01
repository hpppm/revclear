/**
 * Secure Logging Utility with PHI Redaction
 * 
 * HIPAA Requirement: § 164.514(d)(2) - De-identification of PHI in logs
 * 
 * This utility automatically redacts Protected Health Information (PHI)
 * before logging to Cloud Logging, preventing accidental PHI exposure.
 * 
 * Usage:
 * import { logSafely, redactPII } from '../utils/logging';
 * 
 * // Instead of console.log()
 * logSafely('info', 'Patient created', { patient_id: 'pat_123', name: 'John Doe' });
 * // Logs: { patient_id: '[REDACTED]', name: '[REDACTED]' }
 */

import { Logging } from '@google-cloud/logging';

const logging = new Logging({ projectId: process.env.GCP_PROJECT_ID });
const log = logging.log('revclear-application');

// PHI patterns to redact
const PHI_PATTERNS = {
  // Social Security Numbers
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  SSN_NO_DASHES: /\b\d{9}\b/g,
  
  // Patient/Medical Record Numbers (common formats)
  MRN: /\b(MRN|mrn|patient_id|patientId)[:\s]*[A-Za-z0-9-_]{6,20}\b/gi,
  
  // Phone Numbers (US format)
  PHONE: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // Email Addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Dates of Birth (various formats)
  DOB: /\b(dob|date_of_birth|birthdate)[:\s]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi,
  DOB_ISO: /\b\d{4}-\d{2}-\d{2}\b/g,  // YYYY-MM-DD format
  
  // Credit Card Numbers (Luhn algorithm check not implemented for simplicity)
  CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // Names (common patterns - not foolproof)
  NAME_FIELD: /\b(first_name|last_name|full_name|patient_name|name)[:\s]*[A-Za-z\s]{2,50}\b/gi,
  
  // Addresses
  ADDRESS: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
  
  // ZIP Codes (5-digit or ZIP+4)
  ZIP: /\b\d{5}(-\d{4})?\b/g
};

// Fields that should always be redacted (case-insensitive)
const SENSITIVE_FIELD_NAMES = [
  'ssn',
  'social_security_number',
  'patient_id',
  'patient_name',
  'first_name',
  'last_name',
  'full_name',
  'name',
  'email',
  'phone',
  'phone_number',
  'mobile',
  'dob',
  'date_of_birth',
  'birthdate',
  'address',
  'street',
  'city',
  'zip',
  'zipcode',
  'postal_code',
  'mrn',
  'medical_record_number',
  'password',
  'password_hash',
  'api_key',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'credit_card',
  'card_number'
];

/**
 * Redact PHI from a string
 * 
 * @param text - Text that may contain PHI
 * @returns Text with PHI replaced by [REDACTED]
 * 
 * Example:
 * redactPII('Patient John Doe, SSN 123-45-6789')
 * // Returns: 'Patient John Doe, SSN [REDACTED]'
 */
export function redactPII(text: string): string {
  if (typeof text !== 'string') {
    return text;
  }

  let redacted = text;

  // Apply all PHI patterns
  for (const [name, pattern] of Object.entries(PHI_PATTERNS)) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  return redacted;
}

/**
 * Redact PHI from an object (recursively)
 * 
 * @param obj - Object that may contain PHI in its values
 * @returns Deep copy of object with PHI redacted
 * 
 * Example:
 * redactObject({ name: 'John Doe', email: 'john@example.com', age: 35 })
 * // Returns: { name: '[REDACTED]', email: '[REDACTED]', age: 35 }
 */
export function redactObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string') {
    return redactPII(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return '[REDACTED_DATE]';
  }

  // Handle objects
  if (typeof obj === 'object') {
    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();

      // Check if field name indicates PHI
      const isSensitiveField = SENSITIVE_FIELD_NAMES.some(
        sensitiveField => keyLower.includes(sensitiveField)
      );

      if (isSensitiveField) {
        redacted[key] = '[REDACTED]';
      } else {
        // Recursively redact nested objects
        redacted[key] = redactObject(value);
      }
    }

    return redacted;
  }

  return obj;
}

/**
 * Severity levels for Cloud Logging
 */
export type LogSeverity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'ALERT' | 'EMERGENCY';

/**
 * Safely log a message to Cloud Logging with PHI redaction
 * 
 * @param severity - Log level (DEBUG, INFO, WARNING, ERROR, etc.)
 * @param message - Log message
 * @param metadata - Additional context (will be redacted for PHI)
 * 
 * Example:
 * logSafely('INFO', 'Patient created', { 
 *   patient_id: 'pat_123', 
 *   name: 'John Doe',
 *   age: 35 
 * });
 * // Logs: { patient_id: '[REDACTED]', name: '[REDACTED]', age: 35 }
 */
export async function logSafely(
  severity: LogSeverity,
  message: string,
  metadata?: any
): Promise<void> {
  try {
    // Redact PHI from message
    const redactedMessage = redactPII(message);

    // Redact PHI from metadata
    const redactedMetadata = metadata ? redactObject(metadata) : {};

    // Create log entry
    const entry = log.entry(
      {
        severity: severity,
        resource: {
          type: 'cloud_run_revision',
          labels: {
            service_name: 'revclear-backend',
            location: process.env.GCP_REGION || 'us-central1'
          }
        }
      },
      {
        message: redactedMessage,
        ...redactedMetadata,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    );

    // Write to Cloud Logging
    await log.write(entry);
  } catch (error) {
    // Fallback to console.error (but still redact!)
    console.error('Failed to write to Cloud Logging:', error);
    console.error('[REDACTED LOG]:', redactPII(message));
  }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  debug: (message: string, metadata?: any) => logSafely('DEBUG', message, metadata),
  info: (message: string, metadata?: any) => logSafely('INFO', message, metadata),
  notice: (message: string, metadata?: any) => logSafely('NOTICE', message, metadata),
  warn: (message: string, metadata?: any) => logSafely('WARNING', message, metadata),
  warning: (message: string, metadata?: any) => logSafely('WARNING', message, metadata),
  error: (message: string, metadata?: any) => logSafely('ERROR', message, metadata),
  critical: (message: string, metadata?: any) => logSafely('CRITICAL', message, metadata),
  alert: (message: string, metadata?: any) => logSafely('ALERT', message, metadata),
  emergency: (message: string, metadata?: any) => logSafely('EMERGENCY', message, metadata)
};

/**
 * Log an error with stack trace (PHI-safe)
 * 
 * @param error - Error object
 * @param context - Additional context about where error occurred
 */
export async function logError(error: Error, context?: any): Promise<void> {
  await logSafely('ERROR', redactPII(error.message), {
    error_name: error.name,
    stack_trace: redactPII(error.stack || ''),
    ...context
  });
}

/**
 * Middleware to replace console.log in Express
 * 
 * Usage in index.ts:
 * import { attachSecureLogging } from './utils/logging';
 * attachSecureLogging();
 */
export function attachSecureLogging(): void {
  // Override console methods with PHI-safe versions
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  console.log = (...args: any[]) => {
    const redactedArgs = args.map(arg => 
      typeof arg === 'string' ? redactPII(arg) : redactObject(arg)
    );
    originalConsoleLog('[SAFE]', ...redactedArgs);
    logger.info(redactedArgs.join(' '));
  };

  console.error = (...args: any[]) => {
    const redactedArgs = args.map(arg => 
      typeof arg === 'string' ? redactPII(arg) : redactObject(arg)
    );
    originalConsoleError('[SAFE]', ...redactedArgs);
    logger.error(redactedArgs.join(' '));
  };

  console.warn = (...args: any[]) => {
    const redactedArgs = args.map(arg => 
      typeof arg === 'string' ? redactPII(arg) : redactObject(arg)
    );
    originalConsoleWarn('[SAFE]', ...redactedArgs);
    logger.warn(redactedArgs.join(' '));
  };

  console.info = (...args: any[]) => {
    const redactedArgs = args.map(arg => 
      typeof arg === 'string' ? redactPII(arg) : redactObject(arg)
    );
    originalConsoleInfo('[SAFE]', ...redactedArgs);
    logger.info(redactedArgs.join(' '));
  };

  console.log('✅ Secure logging initialized - all console.* calls now PHI-safe');
}

/**
 * Test function to validate redaction (use in development only)
 */
export function testRedaction(): void {
  console.log('\n🧪 Testing PHI Redaction:\n');

  const testCases = [
    {
      input: 'Patient John Doe, SSN 123-45-6789',
      expected: 'SSN redacted'
    },
    {
      input: 'Contact: john.doe@example.com or call 555-123-4567',
      expected: 'Email and phone redacted'
    },
    {
      input: { 
        name: 'Jane Smith', 
        email: 'jane@test.com', 
        age: 35,
        patient_id: 'PAT-12345'
      },
      expected: 'Object fields redacted'
    },
    {
      input: 'DOB: 1985-03-15, Address: 123 Main Street, ZIP 90210',
      expected: 'DOB, address, and ZIP redacted'
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.expected}`);
    console.log('Input:', testCase.input);
    console.log('Output:', typeof testCase.input === 'string' 
      ? redactPII(testCase.input)
      : redactObject(testCase.input)
    );
    console.log('---');
  });
}

// Export all functions
export default {
  redactPII,
  redactObject,
  logSafely,
  logger,
  logError,
  attachSecureLogging,
  testRedaction
};
