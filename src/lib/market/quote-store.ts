import "server-only";

import { getCoinDcxFuturesTrades, getCoinDcxTicker } from "@/lib/brokers/coindcx-core";
import { mt5BridgeClient } from "@/lib/brokers/mt5-bridge-client";
import type { Mt5UserCredentials } from "@/lib/brokers/connection-store";
import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { coinDcxPairFor, coinDcxSymbolFor } from "@/lib/market-data/providers/coindcx/feed-normalizer";
import { upstoxInstrumentKeyFor } from "@/lib/market-data/providers/upstox/feed-normalizer";
import { adminSelect } from "@/lib/supabase/admin-rest";
import type { MarketQuote } from "@/types/market";

export interface QuoteStore {
  list(symbols?: string[]): Promise<MarketQuote[]>;
  get(instrumentId: string): Promise<MarketQuote | null>;
}

type Resolved = { requested: string; symbol: string; instrumentId: string; provider: "upstox" | "coindcx" | "coindcx-futures" | "forex"; providerKey: string };
type Row = Record<string, unknown>;
const resolutionCache = new Map<string, Resolved>();
let mt5Cache: { credentials: Mt5UserCredentials; expires: number } | null = null;
const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const direction = (change: number): MarketQuote["direction"] => change > 0 ? "up" : change < 0 ? "down" : "flat";
const baseUrl = () => (process.env.ZERION_MARKET_DATA_BASE_URL ?? "https://zerionx1.onrender.com").replace(/\/$/, "");

function isForex(value: string) {
  const v = normalize(value.replace(/^forex:/i, ""));
  return v.startsWith("XAU") || v.startsWith("XAG") || /^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)$/.test(v);
}
function cryptoPair(value: string) {
  const raw = value.replace(/^coindcx(?:-futures)?:/i, "").trim().toUpperCase();
  const configured = coinDcxPairFor(raw);
  if (configured) return configured;
  if (raw.startsWith("B-") && raw.includes("_")) return raw;
  const clean = raw.replaceAll("-", "/").replaceAll("_", "/");
  const parts = clean.includes("/") ? clean.split("/").filter(Boolean) : clean.endsWith("USDT") ? [clean.slice(0, -4), "USDT"] : [];
  return parts.length === 2 ? `B-${parts[0]}_${parts[1]}` : null;
}
function looksCrypto(value: string) {
  return value.toLowerCase().startsWith("coindcx:") || value.toLowerCase().startsWith("coindcx-futures:") || Boolean(cryptoPair(value));
}

async function resolveUpstox(requested: string): Promise<Resolved | null> {
  const raw = requested.replace(/^upstox:/i, "").trim();
  if (raw.includes("|")) return { requested, symbol: requested.toLowerCase().startsWith("upstox:") ? raw : requested, instrumentId: `upstox:${raw}`, provider: "upstox", providerKey: raw };
  const configured = upstoxInstrumentKeyFor(raw);
  if (configured) return { requested, symbol: raw, instrumentId: `upstox:${configured}`, provider: "upstox", providerKey: configured };
  try {
    const response = await upstoxClient.instrumentSearch(raw, "page_number=1&records=25") as { data?: Row[] };
    const rows = response.data ?? [];
    const wanted = normalize(raw);
    const hit = rows.find((row) => normalize(String(row.trading_symbol ?? row.short_name ?? row.name ?? "")) === wanted && String(row.instrument_key ?? "").includes("|"))
      ?? rows.find((row) => String(row.instrument_key ?? "").includes("|"));
    if (!hit) return null;
    const key = String(hit.instrument_key);
    const symbol = String(hit.trading_symbol ?? hit.short_name ?? hit.name ?? raw);
    return { requested, symbol, instrumentId: `upstox:${key}`, provider: "upstox", providerKey: key };
  } catch { return null; }
}

async function resolve(requested: string): Promise<Resolved | null> {
  const cacheKey = requested.trim().toUpperCase();
  const cached = resolutionCache.get(cacheKey); if (cached) return cached;
  let resolved: Resolved | null = null;
  if (requested.toLowerCase().startsWith("forex:") || isForex(requested)) {
    const symbol = requested.replace(/^forex:/i, "").trim().toUpperCase();
    resolved = { requested, symbol, instrumentId: `forex:${symbol}`, provider: "forex", providerKey: symbol };
  } else if (requested.toLowerCase().startsWith("coindcx-futures:")) {
    const pair = cryptoPair(requested);
    if (pair) resolved = { requested, symbol: coinDcxSymbolFor(pair), instrumentId: `coindcx-futures:${pair}`, provider: "coindcx-futures", providerKey: pair };
  } else if (looksCrypto(requested)) {
    const pair = cryptoPair(requested);
    if (pair) resolved = { requested, symbol: coinDcxSymbolFor(pair), instrumentId: `coindcx:${pair}`, provider: "coindcx", providerKey: pair };
  } else resolved = await resolveUpstox(requested);
  if (resolved) resolutionCache.set(cacheKey, resolved);
  return resolved;
}

async function resolveMany(symbols: string[]) {
  const out: Array<Resolved | null> = new Array(symbols.length).fill(null);
  const concurrency = 8;
  for (let i = 0; i < symbols.length; i += concurrency) {
    const chunk = symbols.slice(i, i + concurrency);
    const rows = await Promise.all(chunk.map(resolve));
    rows.forEach((row, offset) => { out[i + offset] = row; });
  }
  return out.filter((row): row is Resolved => Boolean(row));
}

async function warmScannerSubscriptions(resolved: Resolved[]) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;
  const instruments = resolved.filter((row) => row.provider === "upstox" || row.provider === "coindcx").map((row) => row.instrumentId);
  if (!instruments.length) return;
  await fetch(`${baseUrl()}/subscriptions/scanner`, { method: "POST", cache: "no-store", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ instruments }) }).catch(() => null);
}

async function gatewaySnapshot(resolved: Resolved[]) {
  const wanted = resolved.filter((row) => row.provider === "upstox" || row.provider === "coindcx");
  if (!wanted.length) return new Map<string, MarketQuote>();
  const response = await fetch(`${baseUrl()}/quotes?symbols=${encodeURIComponent(wanted.map((row) => row.instrumentId).join(","))}`, { cache: "no-store", signal: AbortSignal.timeout(4_000) }).catch(() => null);
  if (!response?.ok) return new Map();
  const payload = await response.json().catch(() => ({ data: [] })) as { data?: Row[] };
  const map = new Map<string, MarketQuote>();
  for (const row of payload.data ?? []) {
    if (!Number.isFinite(Number(row.price))) continue;
    const quote = row as unknown as MarketQuote;
    map.set(String(row.instrumentId ?? "").toUpperCase(), quote);
    map.set(String(row.symbol ?? "").toUpperCase(), quote);
  }
  return map;
}

function upstoxQuote(row: Row, resolved: Resolved): MarketQuote | null {
  const price = Number(row.last_price ?? row.ltp); if (!(price > 0)) return null;
  const ohlc = (row.ohlc && typeof row.ohlc === "object" ? row.ohlc : {}) as Row;
  const previousClose = Number(ohlc.close ?? row.cp ?? price), change = Number(row.net_change ?? price - previousClose);
  const timestampRaw = Number(row.last_trade_time ?? Date.now());
  let timestamp = Number.isFinite(timestampRaw) && timestampRaw > 0 ? timestampRaw : Date.now();
  if (timestamp > 10_000_000_000_000) timestamp = Math.floor(timestamp / 1000);
  else if (timestamp < 10_000_000_000) timestamp *= 1000;
  return { instrumentId: resolved.instrumentId, symbol: resolved.symbol, price, change, changePercent: previousClose ? change / previousClose * 100 : 0, open: Number(ohlc.open ?? previousClose), high: Number(ohlc.high ?? Math.max(price, previousClose)), low: Number(ohlc.low ?? Math.min(price, previousClose)), previousClose, volume: Number.isFinite(Number(row.volume)) ? Number(row.volume) : undefined, timestamp: new Date(timestamp).toISOString(), direction: direction(change), source: "provider", delayed: false };
}

async function batchUpstox(resolved: Resolved[]) {
  const rows = resolved.filter((row) => row.provider === "upstox");
  const map = new Map<string, MarketQuote>(); if (!rows.length) return map;
  try {
    const response = await upstoxClient.fullQuotes(rows.map((row) => row.providerKey)) as { data?: Record<string, Row> };
    const values = Object.values(response.data ?? {});
    for (const item of rows) {
      const hit = values.find((row) => String(row.instrument_token ?? row.instrument_key ?? "") === item.providerKey) ?? values.find((row) => normalize(String(row.symbol ?? row.trading_symbol ?? "")) === normalize(item.symbol));
      if (!hit) continue; const quote = upstoxQuote(hit, item); if (quote) map.set(item.instrumentId.toUpperCase(), quote);
    }
  } catch {}
  return map;
}

async function batchCoinDcx(resolved: Resolved[]) {
  const rows = resolved.filter((row) => row.provider === "coindcx");
  const map = new Map<string, MarketQuote>(); if (!rows.length) return map;
  try {
    const ticker = await getCoinDcxTicker();
    for (const item of rows) {
      const market = item.providerKey.replace(/^[A-Z]-/, "").replace("_", "");
      const row = ticker.find((value) => normalize(String(value.market ?? "")) === normalize(market));
      if (!row) continue;
      const price = Number(row.last_price); if (!(price > 0)) continue;
      const pct = Number(row.change_24_hour ?? 0), previousClose = pct === -100 ? price : price / (1 + pct / 100), change = price - previousClose;
      const timestampRaw = Number(row.timestamp ?? Date.now());
      const timestamp = Number.isFinite(timestampRaw) && timestampRaw > 0
        ? (timestampRaw < 10_000_000_000 ? timestampRaw * 1000 : timestampRaw)
        : Date.now();
      map.set(item.instrumentId.toUpperCase(), { instrumentId: item.instrumentId, symbol: item.symbol, price, change, changePercent: pct, open: previousClose, high: Number(row.high ?? price), low: Number(row.low ?? price), previousClose, volume: Number(row.volume ?? 0), timestamp: new Date(timestamp).toISOString(), direction: direction(change), source: "provider", delayed: false });
    }
  } catch {}
  return map;
}

async function batchCoinDcxFutures(resolved: Resolved[]) {
  const rows = resolved.filter((row) => row.provider === "coindcx-futures");
  const map = new Map<string, MarketQuote>();
  await Promise.all(rows.map(async (item) => {
    try {
      const trades = await getCoinDcxFuturesTrades(item.providerKey);
      const sorted = [...trades].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      const latest = sorted[0];
      if (!latest) return;
      const price = Number(latest.price); if (!(price > 0)) return;
      const previousClose = Number(sorted[1]?.price ?? price), change = price - previousClose;
      const prices = sorted.slice(0, 50).map((trade) => Number(trade.price)).filter((value) => Number.isFinite(value) && value > 0);
      let timestamp = Number(latest.timestamp ?? Date.now());
      if (timestamp > 10_000_000_000_000) timestamp = Math.floor(timestamp / 1000);
      else if (timestamp < 10_000_000_000) timestamp *= 1000;
      map.set(item.instrumentId.toUpperCase(), { instrumentId: item.instrumentId, symbol: item.symbol, price, change, changePercent: previousClose ? change / previousClose * 100 : 0, open: previousClose, high: prices.length ? Math.max(...prices) : price, low: prices.length ? Math.min(...prices) : price, previousClose, volume: sorted.slice(0, 50).reduce((sum, trade) => sum + Number(trade.quantity ?? 0), 0), timestamp: new Date(timestamp).toISOString(), direction: direction(change), source: "provider", delayed: false });
    } catch {}
  }));
  return map;
}

async function scannerMt5Credentials() {
  if (mt5Cache && mt5Cache.expires > Date.now()) return mt5Cache.credentials;
  const row = (await adminSelect("broker_connections", "broker_key=eq.exness-mt5&status=eq.connected&select=metadata&order=updated_at.desc&limit=1").catch(() => []))[0];
  const metadata = (row?.metadata ?? {}) as Row, sealed = String(metadata.token_envelope ?? ""); if (!sealed) return null;
  try {
    const token = openBrokerSecret<Record<string, unknown>>(sealed);
    const credentials: Mt5UserCredentials = { login: String(token.login ?? ""), password: String(token.password ?? ""), server: String(token.server ?? ""), environment: String(token.environment ?? "demo").toLowerCase() === "real" ? "real" : "demo" };
    if (!credentials.login || !credentials.password || !credentials.server) return null;
    mt5Cache = { credentials, expires: Date.now() + 60_000 }; return credentials;
  } catch {
    return null;
  }
}

async function mt5Quote(resolved: Resolved, credentials: Mt5UserCredentials): Promise<MarketQuote | null> {
  try {
    const [tickPayload, candlePayload] = await Promise.all([mt5BridgeClient.marketTick(credentials, resolved.providerKey), mt5BridgeClient.marketCandles(credentials, resolved.providerKey, "5m", 24)]);
    const tick = tickPayload as Row, candles = Array.isArray((candlePayload as { candles?: unknown[] }).candles) ? (candlePayload as { candles: Row[] }).candles : [];
    const latest = candles.at(-1) ?? {}, previous = candles.at(-2) ?? latest;
    const bid = Number(tick.bid ?? 0), ask = Number(tick.ask ?? 0), last = Number(tick.last ?? tick.price ?? 0), price = last > 0 ? last : bid > 0 && ask > 0 ? (bid + ask) / 2 : Number(latest.close ?? 0); if (!(price > 0)) return null;
    const previousClose = Number(previous.close ?? latest.open ?? price), change = price - previousClose;
    return { instrumentId: resolved.instrumentId, symbol: resolved.symbol, price, change, changePercent: previousClose ? change / previousClose * 100 : 0, open: Number(latest.open ?? previousClose), high: Math.max(Number(latest.high ?? price), price), low: Math.min(Number(latest.low ?? price), price), previousClose, volume: Number(latest.volume ?? 0), timestamp: new Date().toISOString(), direction: direction(change), source: "provider", delayed: false };
  } catch { return null; }
}

class LiveQuoteStore implements QuoteStore {
  async list(symbols = ["NIFTY 50", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK", "BTC/USDT", "ETH/USDT", "SOL/USDT"]) {
    const resolved = await resolveMany([...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))]);
    await warmScannerSubscriptions(resolved);
    const gateway = await gatewaySnapshot(resolved);
    const missing = resolved.filter((item) => !gateway.has(item.instrumentId.toUpperCase()) && !gateway.has(item.symbol.toUpperCase()));
    const [upstox, coindcx, coindcxFutures, mt5Credentials] = await Promise.all([batchUpstox(missing), batchCoinDcx(missing), batchCoinDcxFutures(missing), scannerMt5Credentials()]);
    const forexRows = mt5Credentials ? await Promise.all(missing.filter((row) => row.provider === "forex").map((row) => mt5Quote(row, mt5Credentials))) : [];
    const forex = new Map(forexRows.filter((row): row is MarketQuote => Boolean(row)).map((row) => [row.instrumentId.toUpperCase(), row]));
    return resolved.map((item) => gateway.get(item.instrumentId.toUpperCase()) ?? gateway.get(item.symbol.toUpperCase()) ?? upstox.get(item.instrumentId.toUpperCase()) ?? coindcx.get(item.instrumentId.toUpperCase()) ?? coindcxFutures.get(item.instrumentId.toUpperCase()) ?? forex.get(item.instrumentId.toUpperCase()) ?? null).filter((row): row is MarketQuote => Boolean(row));
  }
  async get(instrumentId: string) { return (await this.list([instrumentId]))[0] ?? null; }
}

export const quoteStore: QuoteStore = new LiveQuoteStore();
