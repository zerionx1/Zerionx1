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

async function upstoxRequest(path: string, init?: RequestInit) {
  const { token } = await getConnectedBrokerConnection("upstox");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessTokenFrom(token)}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(`Upstox request failed (${response.status})`);
  return json;
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
      (json as { errors?: Array<{ message?: string }> } | null)?.errors?.[0]
        ?.message ?? `Upstox request failed (${response.status})`,
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
  exitAllPositions: (segment?: string) =>
    upstoxRequest(
      `/order/positions/exit${segment ? `?segment=${encodeURIComponent(segment)}` : ""}`,
      { method: "POST" },
    ),
};

export async function getUpstoxAccessTokenForUplink() {
  const { token } = await getConnectedBrokerConnection("upstox");
  return accessTokenFrom(token);
}

export async function getUpstoxMarketDataFeedV3AuthorizeUrl() {
  const accessToken = await getUpstoxAccessTokenForUplink();

  const response = await fetch(
    "https://api.upstox.com/v3/feed/market-data-feed/authorize",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const json = (await response.json().catch(() => null)) as {
    status?: string;
    data?: {
      authorized_redirect_uri?: string;
    };
    errors?: Array<{ message?: string }>;
  } | null;

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.message ??
        `Upstox Market Data Feed V3 authorization failed (${response.status})`,
    );
  }

  const url = json?.data?.authorized_redirect_uri;

  if (!url || !url.startsWith("wss://")) {
    throw new Error("Upstox V3 authorized WebSocket URL is missing");
  }

  return url;
}
