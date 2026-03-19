import crypto from "crypto";
import logger from "./logger";

const ALGO = "aes-256-gcm";
const ENCRYPTED_JSON_MARKER = "__revclear_encrypted";
const ENCRYPTED_TEXT_PREFIX = "revclear:phi:v1:";
let key: Buffer | null = null;

const phiEncryptionKey = process.env.PHI_ENCRYPTION_KEY;

if (
  phiEncryptionKey &&
  phiEncryptionKey !== "your-256-bit-hex-key" &&
  /^[0-9a-fA-F]{64}$/.test(phiEncryptionKey)
) {
  key = Buffer.from(phiEncryptionKey, "hex");
  logger.info('PHI encryption key loaded');
} else {
  logger.warn('PHI_ENCRYPTION_KEY not set or invalid; PHI encryption unavailable');
}

export function encryptPHI(data: string): string {
  if (!key) {
    logger.error('PHI_ENCRYPTION_KEY not configured; cannot encrypt PHI');
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
    logger.error('PHI_ENCRYPTION_KEY not configured; cannot decrypt PHI');
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
    const authTag = Buffer.from(tagStr, "base64");
    if (authTag.length !== 16) {
      throw new Error("Invalid GCM authentication tag length; expected 16 bytes.");
    }
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PHI decrypt error";
    logger.error({ reason: message }, 'PHI decryption failed');
    throw new Error(
      "PHI decryption failed. Data may be corrupted or key mismatch.",
    );
  }
}

type EncryptedJsonEnvelope = {
  [ENCRYPTED_JSON_MARKER]: true;
  ciphertext: string;
};

type PHIRecord = Record<string, any>;

export function isEncryptedPHIJson(value: unknown): value is EncryptedJsonEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>)[ENCRYPTED_JSON_MARKER] === true &&
    typeof (value as Record<string, unknown>).ciphertext === "string"
  );
}

export function encryptPHIJson<T>(value: T): T | EncryptedJsonEnvelope {
  if (value === null || value === undefined) {
    return value;
  }

  return {
    [ENCRYPTED_JSON_MARKER]: true,
    ciphertext: encryptPHI(JSON.stringify(value)),
  };
}

export function decryptPHIJson<T>(value: T | EncryptedJsonEnvelope): T {
  if (!isEncryptedPHIJson(value)) {
    return value as T;
  }

  return JSON.parse(decryptPHI(value.ciphertext)) as T;
}

export function isEncryptedPHIText(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTED_TEXT_PREFIX);
}

export function encryptPHIText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  return `${ENCRYPTED_TEXT_PREFIX}${encryptPHI(value)}`;
}

export function decryptPHIText(
  value: string | Date | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (!isEncryptedPHIText(value)) {
    return value;
  }

  return decryptPHI(value.slice(ENCRYPTED_TEXT_PREFIX.length));
}

export function transformPHIFields<T extends PHIRecord | null | undefined>(
  record: T,
  fields: Iterable<string>,
  transform: (value: any) => any,
): T {
  if (!record) {
    return record;
  }

  const clone: PHIRecord = { ...record };
  for (const field of fields) {
    if (field in clone) {
      clone[field] = transform(clone[field]);
    }
  }

  return clone as T;
}

export function decryptPHIJsonFields<T extends PHIRecord | null | undefined>(
  record: T,
  fields: Iterable<string>,
): T {
  return transformPHIFields(record, fields, (value) => decryptPHIJson(value));
}

export function decryptPHITextFields<T extends PHIRecord | null | undefined>(
  record: T,
  fields: Iterable<string>,
): T {
  return transformPHIFields(record, fields, (value) => decryptPHIText(value));
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
