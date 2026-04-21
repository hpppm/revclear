import { randomInt, createHash } from "crypto";
import {
  insertOtpCode,
  findValidOtpCode,
  markOtpCodeUsed,
  deleteExpiredOtpCodes,
} from "../db/queries";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOTP(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function saveOTP(email: string, code: string): Promise<void> {
  await insertOtpCode(email, hashCode(code));
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  await deleteExpiredOtpCodes(email);
  const row = await findValidOtpCode(email, hashCode(code));
  if (!row) return false;
  await markOtpCodeUsed(row.id);
  return true;
}
