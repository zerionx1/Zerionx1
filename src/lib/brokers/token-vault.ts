import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

type Envelope = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function encryptionKey(): Buffer {
  const raw = process.env.BROKER_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BROKER_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) {
    throw new Error(
      "BROKER_TOKEN_ENCRYPTION_KEY must be a base64 encoded 32-byte key",
    );
  }

  return decoded;
}

export function sealBrokerSecret(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const envelope: Envelope = {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };

  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64");
}

export function openBrokerSecret<T = unknown>(sealed: string): T {
  const envelope = JSON.parse(
    Buffer.from(sealed, "base64").toString("utf8"),
  ) as Envelope;

  if (envelope.v !== 1) {
    throw new Error("Unsupported broker token envelope");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
