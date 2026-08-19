import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.UPSTOX_CLIENT_ID ?? "";
  const redirectUri = process.env.UPSTOX_REDIRECT_URI ?? "";

  return NextResponse.json({
    configured: Boolean(clientId && redirectUri),
    clientIdFingerprint: clientId
      ? createHash("sha256").update(clientId).digest("hex").slice(0, 16)
      : null,
    redirectUri,
  });
}
