import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import { sendError } from "../utils/httpResponses";
import logger from "../utils/logger";

export type AiType = "transcribe" | "soap" | "codes";

// Daily call caps per user per AI type.
// Adjust these to match your API spend budget.
const DAILY_CAPS: Record<AiType, number> = {
  transcribe: 20,
  soap: 30,
  codes: 30,
};

// Atomically increments today's call count and returns the new total.
// Uses INSERT ... ON CONFLICT so the row is created on first call of the day.
const incrementAndFetch = async (userId: string, aiType: AiType): Promise<number> => {
  const result = await query(
    `INSERT INTO ai_usage_quotas (user_id, ai_type, usage_date, call_count, updated_at)
     VALUES ($1, $2, CURRENT_DATE, 1, NOW())
     ON CONFLICT (user_id, ai_type, usage_date)
     DO UPDATE SET
       call_count = ai_usage_quotas.call_count + 1,
       updated_at = NOW()
     RETURNING call_count`,
    [userId, aiType],
  );
  return result.rows[0].call_count as number;
};

export const requireAiQuota = (aiType: AiType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    const cap = DAILY_CAPS[aiType];

    try {
      const count = await incrementAndFetch(userId, aiType);
      if (count > cap) {
        logger.warn({ userId, aiType, count, cap }, "ai-quota: daily limit exceeded");
        return sendError(
          res,
          429,
          `Daily ${aiType} limit of ${cap} calls reached. Resets at midnight UTC.`,
        );
      }
    } catch (err) {
      // Quota DB failure is non-fatal — log and allow the request through
      // so a DB hiccup never blocks clinical workflows.
      logger.error({ err, userId, aiType }, "ai-quota: failed to check quota, allowing request");
    }

    next();
  };
