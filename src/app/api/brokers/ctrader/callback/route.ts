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

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("zx_broker_oauth="))
    ?.split("=")
    .slice(1)
    .join("=");

  if (!code || !cookie?.startsWith("ctrader:")) {
    return redirect(request, "error=ctrader_oauth_state");
  }

  const connection = (
    await select(
      "broker_connections",
      `owner_id=eq.${user.id}&broker_key=eq.ctrader&limit=1`,
    )
  )[0];

  if (!connection) {
    return redirect(request, "error=ctrader_connection");
  }

  const clientId = process.env.CTRADER_CLIENT_ID;
  const clientSecret = process.env.CTRADER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect(request, "error=ctrader_not_configured");
  }

  const tokenUrl = new URL("https://openapi.ctrader.com/apps/token");
  tokenUrl.searchParams.set("grant_type", "authorization_code");
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set(
    "redirect_uri",
    callbackUrl(request, "ctrader"),
  );
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);

  const tokenResponse = await fetch(tokenUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  const tokenPayload = (await tokenResponse.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!tokenResponse.ok || !tokenPayload?.accessToken) {
    await update(
      "broker_connections",
      `id=eq.${String(connection.id)}&owner_id=eq.${user.id}`,
      {
        status: "degraded",
        metadata: {
          provider: "ctrader",
          oauth_error: "token_exchange_failed",
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
    );
    return redirect(request, "error=ctrader_token");
  }

  await update(
    "broker_connections",
    `id=eq.${String(connection.id)}&owner_id=eq.${user.id}`,
    {
      status: "connected",
      metadata: {
        provider: "ctrader",
        token_envelope: sealBrokerSecret(tokenPayload),
        connected_at: new Date().toISOString(),
        expires_in: tokenPayload.expiresIn ?? null,
      },
      updated_at: new Date().toISOString(),
    },
  );

  const response = redirect(request, "connected=ctrader");
  response.cookies.delete("zx_broker_oauth");
  return response;
}
