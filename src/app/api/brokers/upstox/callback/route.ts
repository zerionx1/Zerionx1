import { NextResponse } from "next/server";

import { callbackUrl } from "@/lib/brokers/oauth-config";
import { sealBrokerSecret } from "@/lib/brokers/token-vault";
import { currentUser, select, update } from "@/lib/supabase/rest";

type Row = Record<string, unknown>;

function redirect(request: Request, query: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/brokers?${query}`, new URL(request.url).origin),
  );
}

export async function GET(request: Request) {
  const user = await currentUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("zx_broker_oauth="))
    ?.split("=")
    .slice(1)
    .join("=");

  if (!code || !state || cookie !== `upstox:${state}`) {
    return redirect(request, "error=upstox_oauth_state");
  }

  const connection = (
    await select(
      "broker_connections",
      `owner_id=eq.${user.id}&broker_key=eq.upstox&limit=1`,
    )
  )[0];

  const metadata = (connection?.metadata ?? {}) as Record<string, unknown>;
  if (!connection || metadata.oauth_state !== state) {
    return redirect(request, "error=upstox_oauth_state");
  }

  const clientId = process.env.UPSTOX_CLIENT_ID;
  const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect(request, "error=upstox_not_configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl(request, "upstox"),
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch(
    "https://api.upstox.com/v2/login/authorization/token",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  const tokenPayload = (await tokenResponse.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    await update(
      "broker_connections",
      `id=eq.${String(connection.id)}&owner_id=eq.${user.id}`,
      {
        status: "degraded",
        metadata: {
          provider: "upstox",
          oauth_error: "token_exchange_failed",
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
    );
    return redirect(request, "error=upstox_token");
  }

  await update(
    "broker_connections",
    `id=eq.${String(connection.id)}&owner_id=eq.${user.id}`,
    {
      status: "connected",
      metadata: {
        provider: "upstox",
        token_envelope: sealBrokerSecret(tokenPayload),
        connected_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    },
  );

  const response = redirect(request, "connected=upstox");
  response.cookies.delete("zx_broker_oauth");
  return response;
}
