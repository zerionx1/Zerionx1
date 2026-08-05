import { createHmac, timingSafeEqual } from "node:crypto";
export function signAuditPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
export function verifyAuditPayload(payload: string, signature: string, secret: string): boolean {
  const expected = signAuditPayload(payload, secret);
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
