import "server-only";

import { getConnectedBrokerConnection } from "@/lib/brokers/connection-store";

const API_V2 = "https://api.upstox.com/v2";
const API_V3 = "https://api.upstox.com/v3";

function accessTokenFrom(payload: Record<string, unknown>) {
  const token = payload.access_token;
  if (typeof token !== "string" || !token) {
    throw new Error("Upstox access token is missing");
  }
  return token;
}

async function upstoxFetch(base: string, path: string, init?: RequestInit) {
  const { token } = await getConnectedBrokerConnection("upstox");
  const response = await fetch(`${base}${path}`, {
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

  if (!response.ok) {
    const message =
      (json as { errors?: Array<{ message?: string }> } | null)?.errors?.[0]
        ?.message ??
      (json as { message?: string } | null)?.message ??
      `Upstox request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
}

const upstoxV2Get = (path: string) => upstoxFetch(API_V2, path);
const upstoxV3Get = (path: string, headers?: HeadersInit) =>
  upstoxFetch(API_V3, path, { headers });

export const upstoxClient = {
  profile: () => upstoxV2Get("/user/profile"),
  funds: () =>
    upstoxV3Get("/user/get-funds-and-margin", { "Api-Version": "3.0" }),
  positions: () => upstoxV2Get("/portfolio/short-term-positions"),
  holdings: () => upstoxV2Get("/portfolio/long-term-holdings"),
  orders: () => upstoxV2Get("/order/retrieve-all"),
  trades: () => upstoxV2Get("/order/trades/get-trades-for-day"),
  instrumentSearch: (query: string, filters = "") =>
    upstoxV2Get(
      `/instruments/search?query=${encodeURIComponent(query)}${filters ? `&${filters}` : ""}`,
    ),
  historicalV3: (
    instrumentKey: string,
    unit: "minutes" | "hours" | "days" | "weeks" | "months",
    interval: number,
    toDate: string,
    fromDate?: string,
  ) =>
    upstoxV3Get(
      `/historical-candle/${encodeURIComponent(instrumentKey)}/${unit}/${interval}/${toDate}${
        fromDate ? `/${fromDate}` : ""
      }`,
    ),
  intradayV3: (
    instrumentKey: string,
    unit: "minutes" | "hours" | "days",
    interval: number,
  ) =>
    upstoxV3Get(
      `/historical-candle/intraday/${encodeURIComponent(instrumentKey)}/${unit}/${interval}`,
    ),
  exitAllPositions: (segment?: string) =>
    upstoxFetch(
      API_V2,
      `/order/positions/exit${segment ? `?segment=${encodeURIComponent(segment)}` : ""}`,
      { method: "POST" },
    ),
};

export async function getUpstoxAccessTokenForUplink() {
  const { token } = await getConnectedBrokerConnection("upstox");
  return accessTokenFrom(token);
}
