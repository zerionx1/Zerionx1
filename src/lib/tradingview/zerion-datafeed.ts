"use client";

import type { MarketInstrument, Timeframe } from "@/types/market";
import {
  subscribeZerionRealtime,
  type ZerionLiveQuote,
} from "@/hooks/use-zerion-market-stream";

type TVBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type TVSymbolInfo = {
  ticker: string;
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: "streaming";
  zerionInstrumentId: string;
  zerionSymbol: string;
};

const RESOLUTIONS = ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"];

function clean(v: string) {
  return v.trim().toUpperCase().replace(/[^A-Z0-9._|:-]/g, "");
}

function marketType(item: MarketInstrument) {
  if (item.market === "crypto") return "crypto";
  if (item.market === "forex") return "forex";
  if (item.market === "commodity") return "commodity";
  if (item.market === "indian-options") return "option";
  if (item.market === "indian-futures") return "futures";
  if (item.market === "indian-index") return "index";
  return "stock";
}

function priceScale(tickSize: number) {
  const tick = Number(tickSize);
  if (!Number.isFinite(tick) || tick <= 0) return 100;
  const text = tick.toFixed(8).replace(/0+$/, "");
  const decimals = text.includes(".") ? (text.split(".")[1]?.length ?? 0) : 0;
  return 10 ** Math.min(8, decimals);
}

function toInfo(item: MarketInstrument): TVSymbolInfo {
  return {
    ticker: item.id,
    name: item.symbol,
    full_name: `${item.exchange}:${item.symbol}`,
    description: item.displayName || item.symbol,
    type: marketType(item),
    session: item.market === "crypto" || item.market === "forex" ? "24x7" : "0915-1530",
    timezone: item.market.startsWith("indian-") ? "Asia/Kolkata" : "Etc/UTC",
    exchange: item.exchange || "ZERION",
    listed_exchange: item.exchange || "ZERION",
    minmov: 1,
    pricescale: priceScale(item.tickSize),
    has_intraday: true,
    has_daily: true,
    has_weekly_and_monthly: true,
    supported_resolutions: RESOLUTIONS,
    volume_precision: 8,
    data_status: "streaming",
    zerionInstrumentId: item.id,
    zerionSymbol: item.symbol,
  };
}

function timeframe(resolution: string): Timeframe {
  switch (String(resolution).toUpperCase()) {
    case "1": return "1m";
    case "3": return "3m";
    case "5": return "5m";
    case "15": return "15m";
    case "30": return "30m";
    case "60": return "1h";
    case "240": return "4h";
    case "1D": return "1d";
    case "1W": return "1w";
    default: return "15m";
  }
}

function bucketMs(tf: Timeframe) {
  const values: Record<Timeframe, number> = {
    "1m": 60_000,
    "3m": 180_000,
    "5m": 300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
    "1w": 604_800_000,
  };
  return values[tf];
}

async function search(query: string): Promise<MarketInstrument[]> {
  const q = query.split(":").at(-1)?.trim() || query.trim();
  const response = await fetch(`/api/markets/search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  return response.ok && Array.isArray(body.data) ? (body.data as MarketInstrument[]) : [];
}

export class ZerionTradingViewDatafeed {
  private bars = new Map<string, TVBar>();
  private barSubscriptions = new Map<string, () => void>();
  private quoteSubscriptions = new Map<string, () => void>();

  onReady(callback: (config: Record<string, unknown>) => void) {
    queueMicrotask(() =>
      callback({
        supported_resolutions: RESOLUTIONS,
        supports_search: true,
        supports_group_request: false,
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      }),
    );
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (items: Record<string, unknown>[]) => void,
  ) {
    void search(userInput)
      .then((rows) => {
        const items = rows
          .filter((item) => !exchange || item.exchange.toUpperCase() === exchange.toUpperCase())
          .filter((item) => !symbolType || marketType(item) === symbolType.toLowerCase())
          .slice(0, 100)
          .map((item) => {
            const info = toInfo(item);
            return {
              symbol: item.symbol,
              full_name: info.full_name,
              description: info.description,
              exchange: info.exchange,
              ticker: info.ticker,
              type: info.type,
            };
          });
        onResultReadyCallback(items);
      })
      .catch(() => onResultReadyCallback([]));
  }

  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (info: TVSymbolInfo) => void,
    onResolveErrorCallback: (reason: string) => void,
  ) {
    void search(symbolName)
      .then((rows) => {
        const wanted = clean(symbolName.split(":").at(-1) ?? symbolName);
        const hit =
          rows.find((item) => clean(item.id) === clean(symbolName)) ??
          rows.find((item) => clean(item.symbol) === wanted) ??
          rows[0];
        if (!hit) {
          onResolveErrorCallback(`Instrument not found: ${symbolName}`);
          return;
        }
        onSymbolResolvedCallback(toInfo(hit));
      })
      .catch((error) =>
        onResolveErrorCallback(
          error instanceof Error ? error.message : "Symbol lookup failed",
        ),
      );
  }

  getBars(
    symbolInfo: TVSymbolInfo,
    resolution: string,
    periodParams: { countBack?: number },
    onHistoryCallback: (bars: TVBar[], meta: { noData: boolean }) => void,
    onErrorCallback: (reason: string) => void,
  ) {
    const tf = timeframe(resolution);
    const limit = Math.max(100, Math.min(2000, Number(periodParams.countBack ?? 500)));
    const id = symbolInfo.zerionInstrumentId || symbolInfo.ticker;
    void fetch(
      `/api/markets/${encodeURIComponent(id)}/candles?timeframe=${encodeURIComponent(tf)}&limit=${limit}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error?.message ?? body.message ?? "Candle request failed");
        }
        const rows = Array.isArray(body.data?.candles)
          ? body.data.candles
          : Array.isArray(body.data)
            ? body.data
            : [];
        const bars: TVBar[] = rows
          .map((candle: Record<string, unknown>) => ({
            time: Date.parse(String(candle.time ?? "")),
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: Number(candle.volume ?? 0),
          }))
          .filter(
            (bar: TVBar) =>
              Number.isFinite(bar.time) &&
              Number.isFinite(bar.open) &&
              Number.isFinite(bar.high) &&
              Number.isFinite(bar.low) &&
              Number.isFinite(bar.close),
          )
          .sort((a: TVBar, b: TVBar) => a.time - b.time);
        onHistoryCallback(bars, { noData: bars.length === 0 });
      })
      .catch((error) =>
        onErrorCallback(error instanceof Error ? error.message : "Candle request failed"),
      );
  }

  subscribeBars(
    symbolInfo: TVSymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: TVBar) => void,
    subscriberUID: string,
  ) {
    this.unsubscribeBars(subscriberUID);
    const tf = timeframe(resolution);
    const width = bucketMs(tf);
    const stop = subscribeZerionRealtime(
      [symbolInfo.zerionInstrumentId, symbolInfo.zerionSymbol, symbolInfo.ticker],
      (quote: ZerionLiveQuote | null) => {
        if (!quote || !Number.isFinite(quote.price)) return;
        const when = Date.parse(quote.timestamp) || Date.now();
        const start = Math.floor(when / width) * width;
        const previous = this.bars.get(subscriberUID);
        const next: TVBar =
          !previous || previous.time !== start
            ? {
                time: start,
                open: quote.price,
                high: quote.price,
                low: quote.price,
                close: quote.price,
                volume: quote.volume,
              }
            : {
                time: previous.time,
                open: previous.open,
                high: Math.max(previous.high, quote.price),
                low: Math.min(previous.low, quote.price),
                close: quote.price,
                volume: quote.volume ?? previous.volume,
              };
        this.bars.set(subscriberUID, next);
        onRealtimeCallback(next);
      },
    );
    this.barSubscriptions.set(subscriberUID, stop);
  }

  unsubscribeBars(subscriberUID: string) {
    this.barSubscriptions.get(subscriberUID)?.();
    this.barSubscriptions.delete(subscriberUID);
    this.bars.delete(subscriberUID);
  }

  getQuotes(
    symbols: string[],
    onDataCallback: (quotes: Record<string, unknown>[]) => void,
    onErrorCallback: (reason: string) => void,
  ) {
    Promise.all(symbols.map((symbol) => search(symbol).then((rows) => rows[0] ?? null)))
      .then((items) => {
        const valid = items.filter((item): item is MarketInstrument => Boolean(item));
        if (!valid.length) {
          onDataCallback([]);
          return;
        }
        const quotes = new Map<string, Record<string, unknown>>();
        const stops: (() => void)[] = [];
        valid.forEach((item) => {
          const stop = subscribeZerionRealtime([item.id, item.symbol], (quote) => {
            if (!quote) return;
            quotes.set(item.id, {
              s: "ok",
              n: item.id,
              v: {
                ch: quote.change,
                chp: quote.changePercent,
                short_name: item.symbol,
                exchange: item.exchange,
                original_name: item.symbol,
                description: item.displayName,
                lp: quote.price,
                ask: quote.ask ?? quote.price,
                bid: quote.bid ?? quote.price,
                open_price: quote.open,
                high_price: quote.high,
                low_price: quote.low,
                prev_close_price: quote.previousClose,
                volume: quote.volume ?? 0,
              },
            });
            if (quotes.size === valid.length) {
              stops.forEach((fn) => fn());
              onDataCallback([...quotes.values()]);
            }
          });
          stops.push(stop);
        });
        window.setTimeout(() => {
          stops.forEach((fn) => fn());
          if (quotes.size < valid.length) onDataCallback([...quotes.values()]);
        }, 2500);
      })
      .catch((error) =>
        onErrorCallback(error instanceof Error ? error.message : "Quote request failed"),
      );
  }

  subscribeQuotes(
    symbols: string[],
    fastSymbols: string[],
    onRealtimeCallback: (quotes: Record<string, unknown>[]) => void,
    listenerGuid: string,
  ) {
    this.unsubscribeQuotes(listenerGuid);
    const all = [...new Set([...symbols, ...fastSymbols])];
    const stop = subscribeZerionRealtime(all, (quote) => {
      if (!quote) return;
      onRealtimeCallback([
        {
          s: "ok",
          n: quote.instrumentId,
          v: {
            ch: quote.change,
            chp: quote.changePercent,
            short_name: quote.symbol,
            exchange: quote.provider,
            original_name: quote.symbol,
            lp: quote.price,
            ask: quote.ask ?? quote.price,
            bid: quote.bid ?? quote.price,
            open_price: quote.open,
            high_price: quote.high,
            low_price: quote.low,
            prev_close_price: quote.previousClose,
            volume: quote.volume ?? 0,
          },
        },
      ]);
    });
    this.quoteSubscriptions.set(listenerGuid, stop);
  }

  unsubscribeQuotes(listenerGuid: string) {
    this.quoteSubscriptions.get(listenerGuid)?.();
    this.quoteSubscriptions.delete(listenerGuid);
  }
}

export const zerionTradingViewDatafeed = new ZerionTradingViewDatafeed();
