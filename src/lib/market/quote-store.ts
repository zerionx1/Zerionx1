import type { MarketQuote } from "@/types/market";

export interface QuoteStore {
  list(symbols?: string[]): Promise<MarketQuote[]>;
  get(instrumentId: string): Promise<MarketQuote | null>;
}

function direction(change: number): MarketQuote["direction"] {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

function normalizedPair(symbol: string) {
  return symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

async function binance(symbol: string): Promise<MarketQuote | null> {
  const pair = normalizedPair(symbol);
  if (!pair.endsWith("USDT")) return null;

  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;

  const value = (await response.json()) as Record<string, string>;
  const price = Number(value.lastPrice);
  const previousClose = Number(value.prevClosePrice);
  const change = price - previousClose;

  return {
    instrumentId: `binance:${pair}`,
    symbol: pair.replace("USDT", "/USDT"),
    price,
    change,
    changePercent: Number(value.priceChangePercent),
    open: Number(value.openPrice),
    high: Number(value.highPrice),
    low: Number(value.lowPrice),
    previousClose,
    volume: Number(value.volume),
    timestamp: new Date().toISOString(),
    direction: direction(change),
    source: "provider",
    delayed: false,
  };
}

async function zerionGateway(symbol: string): Promise<MarketQuote | null> {
  const base =
    process.env.ZERION_MARKET_DATA_BASE_URL ??
    "https://zerionx1.onrender.com";

  const response = await fetch(
    `${base.replace(/\/$/, "")}/quote?symbol=${encodeURIComponent(symbol)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;

  const value = (await response.json()) as {
    instrumentId?: string;
    symbol?: string;
    price?: number;
    change?: number;
    changePercent?: number;
    open?: number;
    high?: number;
    low?: number;
    previousClose?: number;
    volume?: number;
    timestamp?: string;
    delayed?: boolean;
  };

  if (typeof value.price !== "number") return null;
  const change = Number(value.change ?? 0);

  return {
    instrumentId: String(value.instrumentId ?? symbol),
    symbol: String(value.symbol ?? symbol),
    price: value.price,
    change,
    changePercent: Number(value.changePercent ?? 0),
    open: Number(value.open ?? value.price),
    high: Number(value.high ?? value.price),
    low: Number(value.low ?? value.price),
    previousClose: Number(value.previousClose ?? value.price - change),
    volume: value.volume,
    timestamp: String(value.timestamp ?? new Date().toISOString()),
    direction: direction(change),
    source: "provider",
    delayed: Boolean(value.delayed),
  };
}

class LiveQuoteStore implements QuoteStore {
  async list(symbols = ["NIFTY 50", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK"]) {
    const rows = await Promise.all(symbols.map((symbol) => this.get(symbol)));
    return rows.filter((value): value is MarketQuote => Boolean(value));
  }

  async get(instrumentId: string) {
    return (
      (await zerionGateway(instrumentId)) ??
      (await binance(instrumentId))
    );
  }
}

export const quoteStore: QuoteStore = new LiveQuoteStore();
