/**
 * Clearinghouse Service
 * Submits EDI 837P claims to a clearinghouse via HTTP.
 * Set CLEARINGHOUSE_URL and CLEARINGHOUSE_API_KEY in .env to enable live submission.
 * Without those values, claims are marked pending and can be submitted manually.
 */

import logger from "../utils/logger";
import { buildStediPayload } from "./ediService";
import { appConfig } from "../config/appConfig";

export interface ClearinghouseResponse {
  status: "accepted" | "denied" | "pending";
  reason?: string;
  transactionId?: string;
  rawResponse?: any;
}

export async function submitClaimToClearinghouse(
  claim: any,
): Promise<ClearinghouseResponse> {
  const { url, apiKey } = appConfig.clearinghouse;

  if (!url || !apiKey) {
    logger.warn("Clearinghouse not configured — marking claim as pending");
    return {
      status: "pending",
      reason: "Clearinghouse not configured. Set CLEARINGHOUSE_URL and CLEARINGHOUSE_API_KEY.",
    };
  }

  const payload = buildStediPayload(claim);

  logger.info({ claimId: claim.id, payerId: claim.payer_id }, "Submitting claim to clearinghouse");

  let raw: any;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    raw = await response.json();

    if (!response.ok) {
      logger.error({ claimId: claim.id, status: response.status, raw }, "Clearinghouse HTTP error");
      return {
        status: "denied",
        reason: extractDenialReason(raw),
        transactionId: raw?.claimReference?.correlationId,
        rawResponse: raw,
      };
    }
  } catch (err) {
    logger.error({ claimId: claim.id, err }, "Clearinghouse network error");
    return {
      status: "pending",
      reason: "Network error contacting clearinghouse. Will retry.",
    };
  }

  return mapResponse(claim.id, raw);
}

// ─── Map Stedi response → our status format ─────────────────────────────────

function mapResponse(claimId: string, raw: any): ClearinghouseResponse {
  const editStatus = (raw?.editStatus || "").toUpperCase();
  const correlationId = raw?.claimReference?.correlationId;

  if (editStatus === "ACCEPTED" || editStatus === "PASSED") {
    logger.info({ claimId, correlationId }, "Claim accepted by clearinghouse");
    return {
      status: "accepted",
      transactionId: correlationId,
      rawResponse: raw,
    };
  }

  if (editStatus === "REJECTED" || editStatus === "FAILED") {
    const reason = extractDenialReason(raw);
    logger.warn({ claimId, correlationId, reason }, "Claim rejected by clearinghouse");
    return {
      status: "denied",
      reason,
      transactionId: correlationId,
      rawResponse: raw,
    };
  }

  // Unknown or processing status
  return {
    status: "pending",
    reason: "Claim received and processing.",
    transactionId: correlationId,
    rawResponse: raw,
  };
}

function extractDenialReason(raw: any): string {
  if (!raw) return "Unknown denial reason";

  // Stedi error array
  if (Array.isArray(raw.errors) && raw.errors.length > 0) {
    return raw.errors.map((e: any) => e.description || e.message || JSON.stringify(e)).join("; ");
  }

  // Single error message
  if (raw.message) return raw.message;
  if (raw.error) return raw.error;
  if (raw.description) return raw.description;

  return "Claim denied — no reason provided by clearinghouse";
}
