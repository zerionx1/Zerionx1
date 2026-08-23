import "server-only";
import type { Mt5UserCredentials } from "@/lib/brokers/connection-store";

type Json = Record<string, unknown>;

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
  return Boolean(process.env.MT5_BRIDGE_URL?.trim() && process.env.MT5_BRIDGE_TOKEN?.trim() && process.env.BROKER_TOKEN_ENCRYPTION_KEY);
}
async function post<T>(path: string, credentials: Mt5UserCredentials, payload: Json = {}, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`${bridgeUrl()}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${bridgeToken()}`,
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ credentials, ...payload }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : typeof body.message === "string" ? body.message : `MT5 bridge request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
export const mt5BridgeClient = {
  verify: (credentials: Mt5UserCredentials) => post<Json>("/session/verify", credentials),
  account: (credentials: Mt5UserCredentials) => post<Json>("/account", credentials),
  positions: (credentials: Mt5UserCredentials) => post<Json>("/positions", credentials),
  orderPlace: (credentials: Mt5UserCredentials, order: Json, key: string) => post<Json>("/order/place", credentials, { order }, key),
  orderModify: (credentials: Mt5UserCredentials, modification: Json) => post<Json>("/order/modify", credentials, { modification }),
  orderClose: (credentials: Mt5UserCredentials, close: Json) => post<Json>("/order/close", credentials, { close }),
};
