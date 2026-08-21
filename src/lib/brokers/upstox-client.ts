import "server-only";

import { getConnectedBrokerConnection } from "@/lib/brokers/connection-store";

const API_V2 = "https://api.upstox.com/v2";
const API_V3 = "https://api.upstox.com/v3";
const API_HFT_V3 = "https://api-hft.upstox.com/v3";

type TokenScope = "account" | "market";

function accessTokenFrom(payload: Record<string, unknown>) {
  const token = payload.access_token;

  if (typeof token !== "string" || !token) {
    throw new Error("Upstox access token is missing");
  }

  return token;
}

async function tokenFor(scope: TokenScope) {
  if (scope === "market") {
    const analytics = process.env.UPSTOX_ANALYTICS_TOKEN?.trim();

    if (analytics) {
      return analytics;
    }
  }

  const { token } = await getConnectedBrokerConnection("upstox");
  return accessTokenFrom(token);
}

async function upstoxFetch(
  base: string,
  path: string,
  init?: RequestInit,
  scope: TokenScope = "account",
) {
  const accessToken = await tokenFor(scope);

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
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

const accountV2Get = (path: string) =>
  upstoxFetch(API_V2, path, undefined, "account");

const accountV3Get = (path: string, headers?: HeadersInit) =>
  upstoxFetch(API_V3, path, { headers }, "account");

const marketV2Get = (path: string) =>
  upstoxFetch(API_V2, path, undefined, "market");

const marketV3Get = (path: string, headers?: HeadersInit) =>
  upstoxFetch(API_V3, path, { headers }, "market");

export const upstoxClient = {
  // User/account APIs remain behind the user's normal OAuth token.
  profile: () => accountV2Get("/user/profile"),

  funds: () =>
    accountV3Get("/user/get-funds-and-margin", {
      "Api-Version": "3.0",
    }),

  positions: () =>
    accountV2Get("/portfolio/short-term-positions"),

  holdings: () =>
    accountV2Get("/portfolio/long-term-holdings"),

  orders: () =>
    accountV2Get("/order/retrieve-all"),

  trades: () =>
    accountV2Get("/order/trades/get-trades-for-day"),

  // Market/read-only APIs prefer the 1-year Analytics Token.
  instrumentSearch: (query: string, filters = "") =>
    marketV2Get(
      `/instruments/search?query=${encodeURIComponent(query)}${
        filters ? `&${filters}` : ""
      }`,
    ),

  fullQuote: (instrumentKey: string) =>
    marketV2Get(
      `/market-quote/quotes?instrument_key=${encodeURIComponent(
        instrumentKey,
      )}`,
    ),

  optionContracts: (instrumentKey: string, expiry?: string) =>
    marketV2Get(
      `/option/contract?instrument_key=${encodeURIComponent(
        instrumentKey,
      )}${
        expiry
          ? `&expiry_date=${encodeURIComponent(expiry)}`
          : ""
      }`,
    ),

  optionChain: (instrumentKey: string, expiry: string) =>
    marketV2Get(
      `/option/chain?instrument_key=${encodeURIComponent(
        instrumentKey,
      )}&expiry_date=${encodeURIComponent(expiry)}`,
    ),

  historicalV3: (
    instrumentKey: string,
    unit: "minutes" | "hours" | "days" | "weeks" | "months",
    interval: number,
    toDate: string,
    fromDate?: string,
  ) =>
    marketV3Get(
      `/historical-candle/${encodeURIComponent(
        instrumentKey,
      )}/${unit}/${interval}/${toDate}${
        fromDate ? `/${fromDate}` : ""
      }`,
    ),

  intradayV3: (
    instrumentKey: string,
    unit: "minutes" | "hours" | "days",
    interval: number,
  ) =>
    marketV3Get(
      `/historical-candle/intraday/${encodeURIComponent(
        instrumentKey,
      )}/${unit}/${interval}`,
    ),

  exitAllPositions: (segment?: string) =>
    upstoxFetch(
      API_V2,
      `/order/positions/exit${
        segment ? `?segment=${encodeURIComponent(segment)}` : ""
      }`,
      { method: "POST" },
      "account",
    ),

  squareOffPositionV3: ({
    instrumentToken,
    quantity,
    product,
  }: {
    instrumentToken: string;
    quantity: number;
    product: string;
  }) => {
    const signedQuantity = Math.trunc(quantity);

    if (!instrumentToken || !signedQuantity) {
      throw new Error(
        "Upstox square-off requires instrument token and non-zero quantity",
      );
    }

    return upstoxFetch(
      API_HFT_V3,
      "/order/place",
      {
        method: "POST",
        body: JSON.stringify({
          quantity: Math.abs(signedQuantity),
          product: product || "I",
          validity: "DAY",
          price: 0,
          tag: "zerion-chart-exit",
          instrument_token: instrumentToken,
          order_type: "MARKET",
          transaction_type: signedQuantity > 0 ? "SELL" : "BUY",
          disclosed_quantity: 0,
          trigger_price: 0,
          is_amo: false,
          slice: true,
          market_protection: -1,
        }),
      },
      "account",
    );
  },
};

export async function getUpstoxAccessTokenForUplink() {
  const { token } = await getConnectedBrokerConnection("upstox");
  return accessTokenFrom(token);
}
