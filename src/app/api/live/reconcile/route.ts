import { getConnectedCoinDcxCredentials } from "@/lib/brokers/coindcx-client";
import { coinDcxAuthRequest } from "@/lib/brokers/coindcx-core";
import { getConnectedMt5Credentials } from "@/lib/brokers/connection-store";
import { mt5BridgeClient } from "@/lib/brokers/mt5-bridge-client";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { emitUserNotification } from "@/lib/notifications/notification-events";
import { fail, ok } from "@/lib/security/api-response";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";

type Row = Record<string, unknown>;
const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const array = (value: unknown) => Array.isArray(value) ? value as Row[] : [];
const status = (value: unknown) => String(value ?? "UNKNOWN").trim().toUpperCase().replaceAll(" ", "_");
const terminal = new Set(["FILLED", "COMPLETE", "COMPLETED", "CANCELLED", "CANCELED", "REJECTED", "PARTIALLY_CANCELLED", "CLOSE", "CLOSED", "EXPIRED", "FAILED"]);

function recent(row: Row, minutes = 20) {
  const raw = row.updated_at ?? row.created_at ?? row.order_timestamp ?? row.exchange_timestamp ?? row.timestamp;
  if (raw == null) return false;
  const numeric = Number(raw);
  let time = Number.isFinite(numeric) ? numeric : Date.parse(String(raw));
  // Upstox GTT timestamps may be microseconds; provider payloads also use seconds/ms.
  if (Number.isFinite(time)) {
    if (time > 10_000_000_000_000) time = Math.floor(time / 1000);
    else if (time < 10_000_000_000) time *= 1000;
  }
  return Number.isFinite(time) && Date.now() - time <= minutes * 60_000;
}

async function track(ownerId: string, broker: string, externalKey: string, nextStatus: string, symbol: string, payload: Row, notifyInitialTerminal = false) {
  if (!externalKey || !nextStatus) return false;
  const query = `owner_id=eq.${ownerId}&broker_key=eq.${encodeURIComponent(broker)}&external_key=eq.${encodeURIComponent(externalKey)}&limit=1`;
  const existing = (await select("broker_lifecycle_state", query))[0];
  const now = new Date().toISOString();
  if (!existing) {
    await insert("broker_lifecycle_state", { owner_id: ownerId, broker_key: broker, external_key: externalKey, symbol: symbol || null, last_status: nextStatus, payload, first_seen_at: now, last_seen_at: now });
    if (!(notifyInitialTerminal && terminal.has(nextStatus))) return false;
  } else {
    const previous = status(existing.last_status);
    await update("broker_lifecycle_state", `id=eq.${encodeURIComponent(String(existing.id))}&owner_id=eq.${ownerId}`, { symbol: symbol || existing.symbol || null, last_status: nextStatus, payload, last_seen_at: now });
    if (previous === nextStatus) return false;
  }
  await emitUserNotification({
    kind: "live-order-update",
    title: `${symbol || broker} · ${nextStatus.replaceAll("_", " ")}`,
    body: `${broker} lifecycle update for ${externalKey}`,
    priority: nextStatus === "REJECTED" || nextStatus === "FAILED" ? "high" : "normal",
    eventKey: `broker-lifecycle:${broker}:${externalKey}:${nextStatus}`,
    actionUrl: "/dashboard/live-trading/history",
    data: { broker, externalKey, symbol, status: nextStatus, payload },
  }).catch(() => {});
  return true;
}

function gttAggregate(row: Row) {
  const rules = array(row.rules);
  if (!rules.length) return "ACTIVE";
  const statuses = rules.map((rule) => status(rule.status));
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.includes("REJECTED")) return "REJECTED";
  if (statuses.includes("OPEN")) return "OPEN";
  if (statuses.includes("TRIGGERED")) return "TRIGGERED";
  if (statuses.includes("COMPLETED")) return "COMPLETED";
  if (statuses.every((value) => value === "CANCELLED" || value === "INACTIVE")) return "CANCELLED";
  if (statuses.every((value) => value === "EXPIRED" || value === "INACTIVE")) return "EXPIRED";
  if (statuses.some((value) => value === "PENDING")) return "PENDING";
  return "SCHEDULED";
}

async function reconcileUpstox(ownerId: string) {
  const [normalPayload, gttPayload] = await Promise.all([
    upstoxClient.orders().catch(() => ({})),
    upstoxClient.gttOrders().catch(() => ({})),
  ]);
  const normal = array(record(normalPayload).data).slice(0, 150);
  const gtt = array(record(gttPayload).data).slice(0, 150);
  let changes = 0;
  for (const row of normal) {
    const key = String(row.order_id ?? row.orderId ?? "");
    const next = status(row.status ?? row.order_status);
    const symbol = String(row.trading_symbol ?? row.tradingsymbol ?? row.instrument_token ?? "Upstox");
    if (await track(ownerId, "upstox", key, next, symbol, row, terminal.has(next) && recent(row))) changes += 1;
  }
  for (const row of gtt) {
    const key = String(row.gtt_order_id ?? "");
    const next = gttAggregate(row);
    const symbol = String(row.trading_symbol ?? row.instrument_token ?? "Upstox GTT");
    if (await track(ownerId, "upstox-gtt", key, next, symbol, row, terminal.has(next) && recent(row))) changes += 1;
  }
  return { standardRows: normal.length, gttRows: gtt.length, changes };
}

async function reconcileCoinDcx(ownerId: string) {
  const credentials = await getConnectedCoinDcxCredentials();
  const statuses = "open,filled,partially_filled,partially_cancelled,cancelled,rejected,untriggered";
  const [buy, sell, margin] = await Promise.all([
    coinDcxAuthRequest<Row[]>(credentials, "/exchange/v1/derivatives/futures/orders", { status: statuses, side: "buy", page: "1", size: "100", margin_currency_short_name: ["USDT"] }).catch((): Row[] => []),
    coinDcxAuthRequest<Row[]>(credentials, "/exchange/v1/derivatives/futures/orders", { status: statuses, side: "sell", page: "1", size: "100", margin_currency_short_name: ["USDT"] }).catch((): Row[] => []),
    coinDcxAuthRequest<Row[]>(credentials, "/exchange/v1/margin/fetch_orders", { details: true, size: 100 }).catch((): Row[] => []),
  ]);
  const futures = [...buy, ...sell].slice(0, 180);
  const marginRows = margin.slice(0, 120);
  let changes = 0;
  for (const row of futures) {
    const key = String(row.id ?? row.order_id ?? "");
    const next = status(row.status);
    const symbol = String(row.pair ?? row.market ?? "CoinDCX Futures");
    if (await track(ownerId, "coindcx-futures", key, next, symbol, row, terminal.has(next) && recent(row))) changes += 1;
  }
  for (const row of marginRows) {
    const key = String(row.id ?? "");
    const next = status(row.status);
    const symbol = String(row.market ?? "CoinDCX Margin");
    if (await track(ownerId, "coindcx-margin", key, next, symbol, row, terminal.has(next) && recent(row))) changes += 1;
  }
  return { futuresRows: futures.length, marginRows: marginRows.length, changes };
}

async function reconcileMt5(ownerId: string) {
  const credentials = await getConnectedMt5Credentials();
  const payload = record(await mt5BridgeClient.positions(credentials));
  const rows = array(payload.positions);
  const open = new Set<string>();
  let changes = 0;
  for (const row of rows) {
    const key = String(row.ticket ?? row.id ?? "");
    if (!key) continue;
    open.add(key);
    if (await track(ownerId, "exness-mt5", key, "OPEN", String(row.symbol ?? "MT5"), row, false)) changes += 1;
  }
  const previous = await select("broker_lifecycle_state", `owner_id=eq.${ownerId}&broker_key=eq.exness-mt5&last_status=eq.OPEN&limit=300`);
  for (const row of previous) {
    const key = String(row.external_key ?? "");
    if (!key || open.has(key)) continue;
    if (await track(ownerId, "exness-mt5", key, "CLOSED", String(row.symbol ?? "MT5"), record(row.payload), false)) changes += 1;
  }
  return { rows: rows.length, changes };
}

export async function POST() {
  try {
    const user = await currentUser();
    const results: Record<string, unknown> = {};
    await Promise.all([
      reconcileUpstox(user.id).then((value) => { results.upstox = value; }).catch((error) => { results.upstox = { skipped: true, error: error instanceof Error ? error.message : "unavailable" }; }),
      reconcileCoinDcx(user.id).then((value) => { results.coindcx = value; }).catch((error) => { results.coindcx = { skipped: true, error: error instanceof Error ? error.message : "unavailable" }; }),
      reconcileMt5(user.id).then((value) => { results.mt5 = value; }).catch((error) => { results.mt5 = { skipped: true, error: error instanceof Error ? error.message : "unavailable" }; }),
    ]);
    return ok({ reconciledAt: new Date().toISOString(), providers: results });
  } catch (error) {
    return fail("LIVE_RECONCILE_FAILED", error instanceof Error ? error.message : "Unable to reconcile live orders", 400);
  }
}
