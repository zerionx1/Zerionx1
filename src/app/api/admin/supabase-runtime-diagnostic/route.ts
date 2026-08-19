import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return NextResponse.json({
    url,
    keyLength: key.length,
    keyType: key.startsWith("sb_secret_")
      ? "sb_secret"
      : key.startsWith("eyJ")
        ? "legacy_jwt"
        : key
          ? "unknown"
          : "missing",
    keyFingerprint: key
      ? createHash("sha256").update(key).digest("hex").slice(0, 16)
      : null,
  });
}
