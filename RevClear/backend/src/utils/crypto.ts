import crypto from "crypto";

const ALGO = "aes-256-gcm";
let key: Buffer | null = null;

const phiEncryptionKey = process.env.PHI_ENCRYPTION_KEY;

if (phiEncryptionKey && phiEncryptionKey !== 'your-256-bit-hex-key' && /^[0-9a-fA-F]{64}$/.test(phiEncryptionKey)) {
  key = Buffer.from(phiEncryptionKey, "hex");
  console.log('PHI encryption key loaded successfully.');
} else {
  console.warn('PHI_ENCRYPTION_KEY is not set, is a placeholder, or is invalid. PHI encryption/decryption will not be functional.');
}

export function encryptPHI(data: string): string {
  if (!key) {
    console.error('PHI_ENCRYPTION_KEY is not configured. Cannot encrypt PHI.');
    return data; // Return original data or throw error
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
    console.error('PHI_ENCRYPTION_KEY is not configured. Cannot decrypt PHI.');
    return payload; // Return original payload or throw error
  }
  try {
    const [ivStr, tagStr, encrypted] = payload.split(":");
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivStr, "base64"));
    decipher.setAuthTag(Buffer.from(tagStr, "base64"));
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt PHI:', error.message);
    return payload; // Return original payload or throw error
  }
}
