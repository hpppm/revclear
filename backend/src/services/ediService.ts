/**
 * EDI 837P Service
 * Converts claim JSON into:
 *   1. Stedi JSON payload  — sent to clearinghouse API
 *   2. Raw EDI 837 string  — for encrypted file download
 *
 * Format: ASC X12 005010X222A2 (professional claims, CMS-1500 equivalent)
 *
 * Environment variables:
 *   EDI_USAGE_INDICATOR  — "T" (test) or "P" (production). Defaults to "T" in
 *                          non-production environments and "P" in production.
 *                          Set explicitly in .env to override.
 */

import { encryptPHI } from "../utils/crypto";

// ─── Code validation ────────────────────────────────────────────────────────

// CPT: exactly 5 alphanumeric chars (standard 5-digit + category-III letter codes)
const CPT_PATTERN = /^[A-Z0-9]{5}$/i;

// ICD-10-CM: letter + 2 digits + optional 1–4 alphanumeric chars (with or without decimal)
const ICD10_PATTERN = /^[A-Z][0-9]{2}[A-Z0-9]{0,4}$/i;

/**
 * Validates CPT and ICD-10 codes before EDI submission.
 * Returns an array of human-readable error messages (empty = valid).
 */
export function validateClaimCodes(claim: any): string[] {
  const errors: string[] = [];

  const icdCodes: string[] = Array.isArray(claim.diagnosis_codes) ? claim.diagnosis_codes : [];
  for (const code of icdCodes) {
    const normalized = code.replace(".", "").toUpperCase();
    if (!ICD10_PATTERN.test(normalized)) {
      errors.push(`Invalid ICD-10 code: "${code}" — expected format A00–Z99.XXXX`);
    }
  }

  const lineItems: any[] = Array.isArray(claim.line_items) ? claim.line_items : [];
  for (const item of lineItems) {
    if (item.procedure_code) {
      if (!CPT_PATTERN.test(String(item.procedure_code).toUpperCase())) {
        errors.push(`Invalid CPT code: "${item.procedure_code}" — must be exactly 5 alphanumeric characters`);
      }
    }
    if (Array.isArray(item.modifiers)) {
      for (const mod of item.modifiers) {
        if (!/^[A-Z0-9]{2}$/i.test(String(mod))) {
          errors.push(`Invalid modifier: "${mod}" on CPT ${item.procedure_code} — must be exactly 2 alphanumeric characters`);
        }
      }
    }
  }

  return errors;
}

// ─── Stedi JSON payload (sent to clearinghouse API) ────────────────────────

export function buildStediPayload(claim: any, orgEdi?: { edi_sender_id?: string; edi_receiver_id?: string } | null): object {
  const bp = claim.billing_provider || {};
  const sp = claim.service_facility || {};
  const rp = claim.rendering_provider || {};
  const sub = claim.subscriber || {};
  const lineItems: any[] = Array.isArray(claim.line_items) ? claim.line_items : [];

  const diagnoseCodes: string[] = Array.isArray(claim.diagnosis_codes)
    ? claim.diagnosis_codes
    : [];

  const diagnoses = diagnoseCodes.map((code: string, i: number) => ({
    qualifierCode: i === 0 ? "ABK" : "ABF", // ABK = principal, ABF = additional
    value: code,
  }));

  const serviceLines = lineItems.map((item: any) => ({
    serviceDate: formatDate(item.date_of_service || claim.service_date_start),
    professionalService: {
      procedureIdentifier: "HC",
      lineItemChargeAmount: String(Number(item.charge_amount || 0).toFixed(2)),
      procedureCode: item.procedure_code,
      procedureModifiers: Array.isArray(item.modifiers) ? item.modifiers.slice(0, 4) : [],
      measurementUnit: "UN",
      serviceUnitCount: String(item.units || 1),
      diagnosisCodePointers: (item.diagnosis_pointers || [1]).map(String),
    },
  }));

  return {
    controlNumber: generateControlNumber(),
    tradingPartnerServiceId: orgEdi?.edi_receiver_id || claim.payer_id || "UNKNOWN",
    submitter: {
      organizationName: bp.name || "Unknown Organization",
      taxId: bp.tax_id || "",
      address: {
        address1: bp.street || "",
        city: bp.city || "",
        state: bp.state || "",
        postalCode: (bp.zip || "").replace(/-/g, ""),
      },
      contactInformation: {
        name: bp.name || "",
        phoneNumber: (bp.phone || "").replace(/\D/g, ""),
      },
    },
    receiver: {
      organizationName: claim.payer_name || "Unknown Payer",
    },
    subscriber: {
      memberId: sub.member_id || "",
      paymentResponsibilityLevelCode: "P",
      firstName: sub.first_name || "",
      lastName: sub.last_name || "",
      gender: mapGender(sub.gender),
      dateOfBirth: formatDate(sub.dob),
      address: {
        address1: sub.address_street || "",
        city: sub.address_city || "",
        state: sub.address_state || "",
        postalCode: (sub.address_zip || "").replace(/-/g, ""),
      },
      relationshipToSubscriberCode: mapRelationship(claim.subscriber_relationship),
    },
    providers: [
      {
        providerType: "BillingProvider",
        npi: bp.npi || "",
        taxId: bp.tax_id || "",
        organizationName: bp.name || "",
        address: {
          address1: bp.street || "",
          city: bp.city || "",
          state: bp.state || "",
          postalCode: (bp.zip || "").replace(/-/g, ""),
        },
      },
      ...(rp.npi
        ? [
            {
              providerType: "RenderingProvider",
              npi: rp.npi,
              lastName: parseProviderName(rp.name).lastName,
              firstName: parseProviderName(rp.name).firstName,
              taxonomyCode: rp.taxonomy_code || "",
            },
          ]
        : []),
    ],
    claimInformation: {
      claimFilingCode: mapFilingCode(claim.insurance_provider),
      patientControlNumber: claim.id,
      claimChargeAmount: String(Number(claim.total_amount || 0).toFixed(2)),
      placeOfServiceCode: sp.place_of_service || "11",
      claimFrequencyCode: claim.submission_type === "corrected" ? "7" : "1",
      signatureIndicator: "Y",
      planParticipationCode: "A",
      benefitsAssignmentCertificationIndicator: "Y",
      releaseInformationCode: "Y",
      diagnoses,
      serviceFacilityLocation: {
        organizationName: sp.name || bp.name || "",
        npi: sp.npi || bp.npi || "",
        address: {
          address1: sp.street || bp.street || "",
          city: sp.city || bp.city || "",
          state: sp.state || bp.state || "",
          postalCode: ((sp.zip || bp.zip) || "").replace(/-/g, ""),
        },
      },
      serviceLines,
    },
  };
}

// ─── Raw EDI 837P string (for encrypted file download) ─────────────────────

export function buildEdi837String(claim: any, orgEdi?: { edi_sender_id?: string; edi_receiver_id?: string } | null): string {
  const bp = claim.billing_provider || {};
  const sp = claim.service_facility || {};
  const rp = claim.rendering_provider || {};
  const sub = claim.subscriber || {};
  const lineItems: any[] = Array.isArray(claim.line_items) ? claim.line_items : [];
  const diagCodes: string[] = Array.isArray(claim.diagnosis_codes) ? claim.diagnosis_codes : [];

  const now = new Date();
  const dateFmt = formatDateCompact(now);
  const timeFmt = now.toISOString().slice(11, 16).replace(":", "");
  const ctrl = generateControlNumber();
  const senderId = padRight((orgEdi?.edi_sender_id || bp.tax_id || "SENDER").replace(/\D/g, ""), 15);
  const receiverId = padRight(orgEdi?.edi_receiver_id || claim.payer_id || "RECEIVER", 15);

  // ISA15: "T" = test, "P" = production.
  // Set EDI_USAGE_INDICATOR=P in .env when going live — no code change needed.
  const usageIndicator =
    process.env.EDI_USAGE_INDICATOR ||
    (process.env.NODE_ENV === "production" ? "P" : "T");

  const segments: string[] = [
    // Interchange envelope
    `ISA*00*          *00*          *ZZ*${senderId}*ZZ*${receiverId}*${dateFmt.slice(2)}*${timeFmt}*^*00501*${ctrl}*0*${usageIndicator}*:`,
    `GS*HC*${(bp.tax_id || "SENDER").replace(/\D/g, "")}*${claim.payer_id || "RECEIVER"}*${dateFmt}*${timeFmt}*1*X*005010X222A2`,
    `ST*837*0001*005010X222A2`,
    `BHT*0019*00*${claim.id.slice(0, 10)}*${dateFmt}*${timeFmt}*CH`,

    // 1000A Submitter
    `NM1*41*2*${ediSafe(bp.name)}*****46*${(bp.tax_id || "").replace(/\D/g, "")}`,
    `PER*IC*${ediSafe(bp.name)}*TE*${(bp.phone || "").replace(/\D/g, "")}`,

    // 1000B Receiver
    `NM1*40*2*${ediSafe(claim.payer_name)}*****46*${claim.payer_id || ""}`,

    // 2000A Billing Provider HL
    `HL*1**20*1`,
    `PRV*BI*PXC*${rp.taxonomy_code || bp.taxonomy_code || ""}`,
    `NM1*85*2*${ediSafe(bp.name)}*****XX*${bp.npi || ""}`,
    `N3*${ediSafe(bp.street)}`,
    `N4*${ediSafe(bp.city)}*${bp.state || ""}*${(bp.zip || "").replace(/-/g, "")}`,
    `REF*EI*${(bp.tax_id || "").replace(/\D/g, "")}`,

    // 2000B Subscriber HL
    `HL*2*1*22*0`,
    `SBR*P*${mapRelationship(claim.subscriber_relationship)}*${sub.group_number || ""}*${ediSafe(sub.group_name || "")}****CI`,
    `NM1*IL*1*${ediSafe(sub.last_name || "")}*${ediSafe(sub.first_name || "")}****MI*${sub.member_id || ""}`,
    `N3*${ediSafe(sub.address_street || "")}`,
    `N4*${ediSafe(sub.address_city || "")}*${sub.address_state || ""}*${(sub.address_zip || "").replace(/-/g, "")}`,
    `DMG*D8*${formatDate(sub.dob)}*${mapGender(sub.gender)}`,
    `NM1*PR*2*${ediSafe(claim.payer_name)}*****PI*${claim.payer_id || ""}`,

    // 2300 Claim
    `CLM*${claim.id.slice(0, 20)}*${Number(claim.total_amount || 0).toFixed(2)}***${sp.place_of_service || "11"}:B:1*Y*A*Y*I`,
    `DTP*472*D8*${formatDate(claim.service_date_start)}`,

    // Diagnoses (HI segment)
    `HI*${diagCodes.map((c: string, i: number) => `${i === 0 ? "ABK" : "ABF"}:${c}`).join("*")}`,

    // 2310B Rendering Provider
    ...(rp.npi
      ? [
          `NM1*82*1*${ediSafe(parseProviderName(rp.name).lastName)}*${ediSafe(parseProviderName(rp.name).firstName)}****XX*${rp.npi}`,
          `PRV*PE*PXC*${rp.taxonomy_code || ""}`,
        ]
      : []),

    // 2400 Service Lines
    ...lineItems.flatMap((item: any, i: number) => [
      `LX*${i + 1}`,
      `SV1*${buildSV1ProcedureCode(item.procedure_code, item.modifiers)}*${Number(item.charge_amount || 0).toFixed(2)}*UN*${item.units || 1}***${(item.diagnosis_pointers || [1]).join(":")}`,
      `DTP*472*D8*${formatDate(item.date_of_service || claim.service_date_start)}`,
    ]),

    // Trailer
    `SE*SEGCOUNT*0001`,
    `GE*1*1`,
    `IEA*1*${ctrl}`,
  ];

  // Replace SEGCOUNT with actual count (ST through SE inclusive)
  const stIndex = segments.findIndex((s) => s.startsWith("ST*"));
  const seIndex = segments.findIndex((s) => s.startsWith("SE*"));
  const segCount = seIndex - stIndex + 1;
  segments[seIndex] = `SE*${segCount}*0001`;

  return segments.join("~\n") + "~";
}

// ─── Encrypt EDI file for secure download ──────────────────────────────────

export function encryptEdiExport(ediContent: string): string {
  return encryptPHI(ediContent);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Sequential control number based on timestamp — unique per submission, reconcilable
function generateControlNumber(): string {
  return String(Date.now()).slice(-9).padStart(9, "0");
}

// Parses a full name string into first/last, handling titles and multi-part surnames
function parseProviderName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = (fullName || "").trim().replace(/^(Dr\.|Dr|Mr\.|Mrs\.|Ms\.|Prof\.)\s*/i, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  // First word = first name, last word = last name (handles middle names/initials)
  return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

// Builds the SV1 procedure code element with up to 4 modifiers
// Format: HC:CPTCODE:MOD1:MOD2:MOD3:MOD4
function buildSV1ProcedureCode(procedureCode: string, modifiers?: string[]): string {
  const parts = ["HC", procedureCode, ...(Array.isArray(modifiers) ? modifiers.slice(0, 4) : [])];
  return parts.join(":");
}

function padRight(str: string, len: number): string {
  return str.slice(0, len).padEnd(len, " ");
}

function ediSafe(str: string): string {
  return (str || "").replace(/[*~]/g, "").toUpperCase().slice(0, 35);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().slice(0, 10).replace(/-/g, "");
  } catch {
    return "";
  }
}

function formatDateCompact(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function mapGender(gender?: string): string {
  if (!gender) return "U";
  const g = gender.toUpperCase();
  if (g === "M") return "M";
  if (g === "F") return "F";
  return "U";
}

function mapRelationship(rel?: string): string {
  const map: Record<string, string> = {
    self: "18",
    spouse: "01",
    child: "19",
    other: "G8",
  };
  return map[rel || "self"] || "18";
}

function mapFilingCode(insuranceProvider?: string): string {
  if (!insuranceProvider) return "ZZ";
  const p = insuranceProvider.toUpperCase();
  if (p.includes("MEDICARE")) return "MB";
  if (p.includes("MEDICAID")) return "MC";
  if (p.includes("TRICARE") || p.includes("CHAMPUS")) return "CH";
  if (p === "SELF_PAY") return "ZZ";
  return "CI"; // Commercial Insurance
}
