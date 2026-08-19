import { NextResponse } from "next/server";

import { callbackUrl } from "@/lib/brokers/oauth-config";
import { sealBrokerSecret } from "@/lib/brokers/token-vault";
import { adminRest } from "@/lib/supabase/admin-rest";

type Row = Record<string, unknown>;

function redirect(request: Request, query: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/brokers?${query}`, new URL(request.url).origin),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return redirect(request, "error=upstox_oauth_state");
  }

  const rows = await adminRest<Row[]>(
    `broker_connections?broker_key=eq.upstox&metadata->>oauth_state=eq.${encodeURIComponent(state)}&limit=1`,
    { method: "GET" },
  );

  const connection = rows[0];
  if (!connection) {
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

  const tokenPayload = (await tokenResponse.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    await adminRest<Row[]>(
      `broker_connections?id=eq.${encodeURIComponent(String(connection.id))}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "degraded",
          metadata: {
            provider: "upstox",
            oauth_error: "token_exchange_failed",
            updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        }),
      },
    );

    return redirect(request, "error=upstox_token");
  }

  await adminRest<Row[]>(
    `broker_connections?id=eq.${encodeURIComponent(String(connection.id))}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "connected",
        metadata: {
          provider: "upstox",
          token_envelope: sealBrokerSecret(tokenPayload),
          connected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }),
    },
  );

  const response = redirect(request, "connected=upstox");
  response.cookies.delete("zx_broker_oauth");
  return response;
}
