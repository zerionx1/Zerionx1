"use client";

import type { MarketInstrument, Timeframe } from "@/types/market";
import {
  subscribeZerionRealtime,
  type ZerionLiveQuote,
} from "@/hooks/use-zerion-market-stream";

type GCSymbolInfo = {
  exchange: string;
  segment: string;
  symbol: string;
  name: string;
  asset_type: "CRYPTO" | "EQUITY" | "FOREX" | "COMMODITY";
  source_id: string;
  tradeable: boolean;
  is_index: boolean;
  is_formula: boolean;
  full_name: string;
  description: string;
  type: string;
};

type GCBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type PeriodParams = {
  from?: Date;
  to?: Date;
  firstDataRequest?: boolean;
  rows?: number;
};

type Resolution =
  | string
  | { scale?: string; units?: number };

type SearchResult = {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  type: string;
  ticker: string;
};

function clean(value: string) {
  return value.trim().toUpperCase().replaceAll("/", "").replaceAll("-", "");
}

function marketType(item: MarketInstrument): GCSymbolInfo["asset_type"] {
  const market = String(item.market).toLowerCase();
  const symbol = item.symbol.toUpperCase();
  if (market.includes("crypto") || symbol.includes("USDT")) return "CRYPTO";
  if (
    market.includes("forex") ||
    symbol.includes("XAU") ||
    symbol.includes("XAG")
  ) {
    return symbol.includes("XAU") || symbol.includes("XAG")
      ? "COMMODITY"
      : "FOREX";
  }
  return "EQUITY";
}

function timeframe(resolution: Resolution): Timeframe {
  const raw =
    typeof resolution === "string"
      ? resolution
      : `${resolution.units ?? 1}${resolution.scale ?? "minutes"}`;

  const value = raw.trim().toLowerCase();

  if (["1", "1m", "1min", "1minute", "1minutes"].includes(value)) return "1m";
  if (["3", "3m", "3min", "3minutes"].includes(value)) return "3m";
  if (["5", "5m", "5min", "5minutes"].includes(value)) return "5m";
  if (["15", "15m", "15min", "15minutes"].includes(value)) return "15m";
  if (["30", "30m", "30min", "30minutes"].includes(value)) return "30m";
  if (["60", "1h", "1hour", "1hours", "60m"].includes(value)) return "1h";
  if (["240", "4h", "4hour", "4hours", "240m"].includes(value)) return "4h";
  if (["1d", "d", "day", "1day", "1days"].includes(value)) return "1d";
  if (["1w", "w", "week", "1week", "1weeks"].includes(value)) return "1w";
  return "15m";
}

function bucketMs(tf: Timeframe) {
  const map: Record<Timeframe, number> = {
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
  return map[tf];
}

function toInfo(item: MarketInstrument): GCSymbolInfo {
  const asset = marketType(item);
  const segment =
    asset === "CRYPTO"
      ? "SPOT"
      : asset === "FOREX" || asset === "COMMODITY"
        ? "FOREX"
        : String(item.market).toUpperCase();

  return {
    exchange: item.exchange || "ZERION",
    segment,
    symbol: item.symbol,
    name: item.displayName || item.symbol,
    asset_type: asset,
    source_id: item.id,
    tradeable: true,
    is_index: String(item.market).toLowerCase().includes("index"),
    is_formula: false,
    full_name: `${item.exchange || "ZERION"}:${item.symbol}`,
    description: item.displayName || item.symbol,
    type: asset.toLowerCase(),
  };
}

async function search(query: string): Promise<MarketInstrument[]> {
  const response = await fetch(
    `/api/markets/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return [];
  return Array.isArray(body.data) ? (body.data as MarketInstrument[]) : [];
}

class GoChartingZerionDatafeed {
  private subscriptions = new Map<string, () => void>();
  private liveBars = new Map<string, GCBar>();

  onReady(callback: (config: Record<string, unknown>) => void) {
    queueMicrotask(() =>
      callback({
        supported_resolutions: [
          "1m",
          "3m",
          "5m",
          "15m",
          "30m",
          "1H",
          "4H",
          "1D",
          "1W",
        ],
        supports_search: true,
        supports_group_request: false,
        supports_marks: false,
        supports_timescale_marks: false,
      }),
    );
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (result: { searchInProgress: boolean; items: SearchResult[] }) => void,
  ) {
    void search(userInput).then((rows) => {
      const filtered = rows.filter((item) => {
        if (exchange && item.exchange !== exchange) return false;
        if (!symbolType) return true;
        return marketType(item).toLowerCase() === symbolType.toLowerCase();
      });

      onResult({
        searchInProgress: false,
        items: filtered.slice(0, 50).map((item) => {
          const info = toInfo(item);
          return {
            symbol: info.symbol,
            full_name: info.full_name,
            description: info.description,
            exchange: info.exchange,
            type: info.type,
            ticker: info.source_id,
          };
        }),
      });
    });
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: GCSymbolInfo) => void,
    onError: (error: string) => void,
  ) {
    void search(symbolName)
      .then((rows) => {
        const hit =
          rows.find(
            (item) =>
              clean(item.symbol) === clean(symbolName) ||
              clean(item.id) === clean(symbolName),
          ) ?? rows[0];

        if (!hit) {
          onError(`Instrument not found: ${symbolName}`);
          return;
        }
        onResolve(toInfo(hit));
      })
      .catch((error) =>
        onError(error instanceof Error ? error.message : "Symbol lookup failed"),
      );
  }

  async getBars(
    symbolInfo: GCSymbolInfo,
    resolution: Resolution,
    periodParams: PeriodParams,
  ) {
    const tf = timeframe(resolution);
    const rows = Math.max(100, Math.min(2000, Number(periodParams.rows ?? 500)));

    const response = await fetch(
      `/api/market/candles?instrument=${encodeURIComponent(
        symbolInfo.source_id,
      )}&timeframe=${encodeURIComponent(tf)}&limit=${rows}`,
      { cache: "no-store" },
    );

    const body = await response.json().catch(() => ({}));
    const candles = Array.isArray(body.data) ? body.data : [];

    const bars = candles
      .map((candle: Record<string, unknown>): GCBar | null => {
        const time = Date.parse(String(candle.time ?? ""));
        const open = Number(candle.open);
        const high = Number(candle.high);
        const low = Number(candle.low);
        const close = Number(candle.close);
        const volume = Number(candle.volume ?? 0);
        if (
          !Number.isFinite(time) ||
          !Number.isFinite(open) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          return null;
        }
        return { time, open, high, low, close, volume };
      })
      .filter((bar: GCBar | null): bar is GCBar => Boolean(bar));

    return {
      bars,
      meta: { noData: bars.length === 0 },
    };
  }

  subscribeBars(
    symbolInfo: GCSymbolInfo,
    resolution: Resolution,
    onRealtimeCallback: (bar: GCBar) => void,
    subscriberUID: string,
  ) {
    this.unsubscribeBars(subscriberUID);

    const tf = timeframe(resolution);
    const width = bucketMs(tf);

    const stop = subscribeZerionRealtime(
      [symbolInfo.source_id, symbolInfo.symbol],
      (quote: ZerionLiveQuote | null) => {
        if (!quote || !Number.isFinite(quote.price)) return;

        const quoteTime = Date.parse(quote.timestamp) || Date.now();
        const start = Math.floor(quoteTime / width) * width;
        const previous = this.liveBars.get(subscriberUID);

        let next: GCBar;
        if (!previous || previous.time !== start) {
          next = {
            time: start,
            open: quote.price,
            high: quote.price,
            low: quote.price,
            close: quote.price,
            volume: quote.volume,
          };
        } else {
          next = {
            time: previous.time,
            open: previous.open,
            high: Math.max(previous.high, quote.price),
            low: Math.min(previous.low, quote.price),
            close: quote.price,
            volume: quote.volume ?? previous.volume,
          };
        }

        this.liveBars.set(subscriberUID, next);
        onRealtimeCallback(next);
      },
    );

    this.subscriptions.set(subscriberUID, stop);
  }

  unsubscribeBars(subscriberUID: string) {
    this.subscriptions.get(subscriberUID)?.();
    this.subscriptions.delete(subscriberUID);
    this.liveBars.delete(subscriberUID);
  }
}

export const goChartingZerionDatafeed = new GoChartingZerionDatafeed();
