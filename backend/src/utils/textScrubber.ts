/**
 * PHI Scrubber — regex-based redaction for structured identifiers.
 *
 * Applied to text before it leaves the server to an external AI endpoint.
 * Covers structured PHI (SSN, phone, email, dates, MRN, ZIP, DOB).
 *
 * LIMITATION: Free-text patient/provider names cannot be reliably redacted
 * with regex alone — NLP-based NER is required for full de-identification.
 * This scrubber is a defence-in-depth layer, not a HIPAA Safe Harbor guarantee.
 * A BAA with the external AI provider is still required.
 */

type ScrubRule = { pattern: RegExp; replacement: string };

const RULES: ScrubRule[] = [
  // SSN: 123-45-6789 | 123 45 6789 | 123456789
  {
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: "[SSN]",
  },
  // US phone: (555) 123-4567 | 555-123-4567 | 5551234567 | +1 555 123 4567
  {
    pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE]",
  },
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  // Dates: MM/DD/YYYY | MM-DD-YYYY | YYYY-MM-DD | Month DD, YYYY
  {
    pattern:
      /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g,
    replacement: "[DATE]",
  },
  {
    pattern: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
    replacement: "[DATE]",
  },
  {
    pattern:
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
    replacement: "[DATE]",
  },
  // DOB context: "DOB: 01/01/1980" | "Date of Birth: ..."
  {
    pattern: /\b(?:dob|date\s+of\s+birth|born(?:\s+on)?)\s*[:\-]?\s*\S+/gi,
    replacement: "[DOB]",
  },
  // MRN: "MRN: 123456" | "Medical Record #: ABC-123"
  {
    pattern: /\b(?:mrn|medical\s+record(?:\s+(?:number|no|#))?)\s*[:\-#]?\s*[\w\-]+/gi,
    replacement: "[MRN]",
  },
  // US ZIP codes: 5-digit standalone or ZIP+4
  {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: "[ZIP]",
  },
  // Street addresses: "123 Main St" | "456 Oak Avenue"
  {
    pattern:
      /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Pl|Place|Way|Pkwy)\b/g,
    replacement: "[ADDRESS]",
  },
];

/**
 * Scrub structured PHI patterns from a string.
 * Returns the redacted string and a count of replacements made.
 */
export function scrubPHI(text: string): { scrubbed: string; redactionCount: number } {
  let result = text;
  let redactionCount = 0;

  for (const { pattern, replacement } of RULES) {
    const before = result;
    result = result.replace(pattern, replacement);
    // Count replacements by comparing lengths as a rough proxy
    if (result !== before) {
      redactionCount++;
    }
  }

  return { scrubbed: result, redactionCount };
}
