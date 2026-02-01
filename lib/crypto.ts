import crypto from "crypto";
import fs from "fs";
import path from "path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getSecretKey(): Buffer {
  const envPath = path.join(process.cwd(), ".env.local");

  // Check if secret key exists in environment
  if (process.env.ENCRYPTION_SECRET) {
    return Buffer.from(process.env.ENCRYPTION_SECRET, "hex");
  }

  // Generate new key if .env.local doesn't exist or doesn't have the key
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  if (!envContent.includes("ENCRYPTION_SECRET=")) {
    const newKey = crypto.randomBytes(KEY_LENGTH).toString("hex");
    const newLine = envContent.length > 0 && !envContent.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(envPath, `${envContent}${newLine}ENCRYPTION_SECRET=${newKey}\n`);
    return Buffer.from(newKey, "hex");
  }

  // Parse existing key from file
  const match = envContent.match(/ENCRYPTION_SECRET=([a-f0-9]+)/);
  if (match) {
    return Buffer.from(match[1], "hex");
  }

  throw new Error("Failed to get or generate encryption key");
}

export function encrypt(text: string): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getSecretKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
