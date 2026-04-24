import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.DRIVE_TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error("DRIVE_TOKEN_ENC_KEY is not set; cannot encrypt/decrypt Google Drive tokens.");
  }
  let key: Buffer;
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 40) {
    key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      try {
        const hex = Buffer.from(raw, "hex");
        if (hex.length === 32) key = hex;
      } catch {}
    }
  } else if (/^[a-fA-F0-9]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "utf8");
  }
  if (key.length !== 32) {
    throw new Error(
      `DRIVE_TOKEN_ENC_KEY must be a 32-byte key (base64 or hex). Got ${key.length} bytes.`,
    );
  }
  cachedKey = key;
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Encrypted token payload is too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
