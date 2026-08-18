import "server-only";

import { getConnectedBrokerConnection } from "@/lib/brokers/connection-store";

const API = "https://api.upstox.com/v2";

function accessTokenFrom(payload: Record<string, unknown>) {
  const token = payload.access_token;
  if (typeof token !== "string" || !token) {
    throw new Error("Upstox access token is missing");
  }
  return token;
}

async function upstoxGet(path: string) {
  const { token } = await getConnectedBrokerConnection("upstox");
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessTokenFrom(token)}`,
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (json as { errors?: Array<{ message?: string }> } | null)?.errors?.[0]?.message ??
        `Upstox request failed (${response.status})`,
    );
  }

  return json;
}

export const upstoxClient = {
  profile: () => upstoxGet("/user/profile"),
  funds: () => upstoxGet("/user/get-funds-and-margin"),
  positions: () => upstoxGet("/portfolio/short-term-positions"),
  holdings: () => upstoxGet("/portfolio/long-term-holdings"),
  orders: () => upstoxGet("/order/retrieve-all"),
  trades: () => upstoxGet("/order/trades/get-trades-for-day"),
};

export async function getUpstoxAccessTokenForUplink() {
  const { token } = await getConnectedBrokerConnection("upstox");
  return accessTokenFrom(token);
}
