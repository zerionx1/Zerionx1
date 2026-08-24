import "server-only";
import type { Mt5UserCredentials } from "@/lib/brokers/connection-store";

type Json = Record<string, unknown>;

export class Mt5BridgeError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "Mt5BridgeError";
    this.status = status;
  }
}

function bridgeUrl() {
  const value = process.env.MT5_BRIDGE_URL?.trim();
  if (!value) throw new Error("MT5_BRIDGE_URL is not configured");
  return value.replace(/\/+$/, "");
}

function bridgeToken() {
  const value = process.env.MT5_BRIDGE_TOKEN?.trim();
  if (!value) throw new Error("MT5_BRIDGE_TOKEN is not configured");
  return value;
}

export function mt5BridgeConfigured() {
  return Boolean(
    process.env.MT5_BRIDGE_URL?.trim() &&
      process.env.MT5_BRIDGE_TOKEN?.trim() &&
      process.env.BROKER_TOKEN_ENCRYPTION_KEY,
  );
}

function transientStatus(status: number) {
  return status === 502 || status === 503 || status === 504;
}

async function requestOnce<T>(
  path: string,
  credentials: Mt5UserCredentials,
  payload: Json,
  idempotencyKey?: string,
): Promise<T> {
  const url = `${bridgeUrl()}${path}`;
  const safeOrigin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return "invalid-url";
    }
  })();

  console.info("[ZERION_MT5_DIAG] request", { origin: safeOrigin, path });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${bridgeToken()}`,
        ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ credentials, ...payload }),
    });

    const rawText = await response.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      body = {};
    }

    console.info("[ZERION_MT5_DIAG] response", {
      origin: safeOrigin,
      path,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      bodyPreview: response.ok ? undefined : rawText.slice(0, 180),
    });

    if (!response.ok) {
      const message =
        typeof body.detail === "string"
          ? body.detail
          : typeof body.message === "string"
            ? body.message
            : `MT5 bridge request failed (${response.status})`;
      throw new Mt5BridgeError(message, response.status);
    }

    return body as T;
  } catch (error) {
    if (error instanceof Mt5BridgeError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new Mt5BridgeError("MT5 bridge request timed out", 504);
    }
    throw new Mt5BridgeError(
      error instanceof Error ? error.message : "MT5 bridge request failed",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function post<T>(
  path: string,
  credentials: Mt5UserCredentials,
  payload: Json = {},
  idempotencyKey?: string,
): Promise<T> {
  // Verification/account reads are safe to retry once if Render/Wine is waking up.
  // Order mutations are never retried here to avoid accidental duplicate execution.
  const retryableRead =
    path === "/session/verify" || path === "/account" || path === "/positions" || path === "/market/symbols" || path === "/market/tick" || path === "/market/candles";
  const attempts = retryableRead ? 3 : 1;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await requestOnce<T>(path, credentials, payload, idempotencyKey);
    } catch (error) {
      lastError = error;
      if (
        attempt + 1 >= attempts ||
        !(error instanceof Mt5BridgeError) ||
        !transientStatus(error.status)
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
    }
  }

  throw lastError;
}

export const mt5BridgeClient = {
  verify: (credentials: Mt5UserCredentials) =>
    post<Json>("/session/verify", credentials),
  account: (credentials: Mt5UserCredentials) => post<Json>("/account", credentials),
  positions: (credentials: Mt5UserCredentials) =>
    post<Json>("/positions", credentials),
  marketSymbols: (credentials: Mt5UserCredentials, query: string) =>
    post<Json>("/market/symbols", credentials, { market: { query } }),
  marketTick: (credentials: Mt5UserCredentials, symbol: string) => post<Json>("/market/tick", credentials, { market: { symbol } }),
  marketCandles: (credentials: Mt5UserCredentials, symbol: string, timeframe: string, count = 500) => post<Json>("/market/candles", credentials, { market: { symbol, timeframe, count } }),
  orderPlace: (credentials: Mt5UserCredentials, order: Json, key: string) =>
    post<Json>("/order/place", credentials, { order }, key),
  orderModify: (credentials: Mt5UserCredentials, modification: Json) =>
    post<Json>("/order/modify", credentials, { modification }),
  orderClose: (credentials: Mt5UserCredentials, close: Json) =>
    post<Json>("/order/close", credentials, { close }),
};
