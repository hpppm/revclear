import crypto from "crypto";

const ALGO = "aes-256-gcm";
let key: Buffer | null = null;

const phiEncryptionKey = process.env.PHI_ENCRYPTION_KEY;

if (
  phiEncryptionKey &&
  phiEncryptionKey !== "your-256-bit-hex-key" &&
  /^[0-9a-fA-F]{64}$/.test(phiEncryptionKey)
) {
  key = Buffer.from(phiEncryptionKey, "hex");
  console.log("PHI encryption key loaded successfully.");
} else {
  console.warn(
    "PHI_ENCRYPTION_KEY is not set, is a placeholder, or is invalid. PHI encryption/decryption will not be functional.",
  );
}

export function encryptPHI(data: string): string {
  if (!key) {
    console.error("PHI_ENCRYPTION_KEY is not configured. Cannot encrypt PHI.");
    throw new Error(
      "PHI encryption is required but not configured. Refusing to store unencrypted data.",
    );
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return iv.toString("base64") + ":" + tag.toString("base64") + ":" + encrypted;
}

export function decryptPHI(payload: string): string {
  if (!key) {
    console.error("PHI_ENCRYPTION_KEY is not configured. Cannot decrypt PHI.");
    throw new Error(
      "PHI decryption key not configured. Cannot access encrypted data.",
    );
  }
  try {
    const [ivStr, tagStr, encrypted] = payload.split(":");
    const decipher = crypto.createDecipheriv(
      ALGO,
      key,
      Buffer.from(ivStr, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagStr, "base64"));
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PHI decrypt error";
    console.error("Failed to decrypt PHI:", message);
    throw new Error(
      "PHI decryption failed. Data may be corrupted or key mismatch.",
    );
  }
}

/**
 * Generate a cryptographically secure invite token.
 * Format: 32 bytes of random data encoded as URL-safe base64 (43 chars)
 *
 * Security: 256 bits of entropy - infeasible to brute force
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash an invite token for storage.
 * We store the hash in the database, not the raw token.
 * This prevents token theft if the database is compromised.
 *
 * @param token - The raw invite token
 * @returns SHA-256 hash of the token (hex encoded)
 */
export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
