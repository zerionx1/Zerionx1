"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { ZerionProChart } from "@/components/charts/zerion-pro-chart";
import { useZerionMarketStream } from "@/hooks/use-zerion-market-stream";
import type { Candle, MarketInstrument, MarketKind } from "@/types/market";

type Props = {
  symbol: string;
  interval?: string;
  height?: number;
};

type Quote = {
  provider?: string;
  price?: number;
  timestamp?: string;
};

function timeframeFromInterval(interval?: string) {
  switch ((interval ?? "15").toUpperCase()) {
    case "1":
    case "1M":
      return "1m";
    case "3":
      return "3m";
    case "5":
      return "5m";
    case "30":
      return "30m";
    case "60":
      return "1h";
    case "240":
      return "4h";
    case "D":
      return "1d";
    case "W":
      return "1w";
    default:
      return "15m";
  }
}

function normalizeInput(value: string) {
  const raw = value.trim().toUpperCase();

  if (raw.includes("BANKNIFTY")) return "BANKNIFTY";
  if (raw.includes("NIFTY50") || raw === "NSE:NIFTY" || raw === "NIFTY")
    return "NIFTY 50";

  const stripped = raw.replace(/^(NSE|BSE|MCX|COINDCX|OANDA|FX):/, "");

  if (stripped.endsWith("USDT") && !stripped.includes("/")) {
    return `${stripped.slice(0, -4)}/USDT`;
  }

  return stripped;
}

function inferMarket(value: string): MarketKind | undefined {
  const raw = value.toUpperCase();
  if (
    raw.includes("BTC") ||
    raw.includes("ETH") ||
    raw.includes("USDT") ||
    raw.startsWith("COINDCX:")
  ) {
    return "crypto";
  }
  if (
    raw.startsWith("OANDA:") ||
    raw.startsWith("FX:") ||
    raw.includes("EUR/USD") ||
    raw.includes("GBP/USD") ||
    raw.includes("XAU/USD")
  ) {
    return "forex";
  }
  if (raw.includes("NIFTY") || raw.startsWith("NSE:")) {
    return "indian-index";
  }
  return undefined;
}

function pickBest(rows: MarketInstrument[], query: string, requested: string) {
  const q = query.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const raw = requested.toUpperCase();

  const exact = rows.find((row) => {
    const symbol = row.symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return symbol === q;
  });
  if (exact) return exact;

  if (raw.includes("BANKNIFTY")) {
    return (
      rows.find((row) =>
        `${row.symbol} ${row.displayName}`.toUpperCase().includes("BANK"),
      ) ?? rows[0]
    );
  }

  return rows[0];
}

function ZerionProviderChartImpl({
  symbol,
  interval = "15",
  height = 800,
}: Props) {
  const timeframe = useMemo(() => timeframeFromInterval(interval), [interval]);
  const [instrument, setInstrument] = useState<MarketInstrument | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);

  const realtimeKeys = useMemo(
    () => (instrument ? [instrument.id, instrument.symbol] : []),
    [instrument],
  );

  const realtimeQuotes = useZerionMarketStream(realtimeKeys);

  const realtimeQuote = instrument
    ? (realtimeQuotes[instrument.id.toUpperCase()] ??
      realtimeQuotes[instrument.symbol.toUpperCase()])
    : undefined;

  const [message, setMessage] = useState("Resolving provider instrument…");
  const [refreshing, setRefreshing] = useState(false);

  const resolveInstrument = useCallback(async () => {
    const query = normalizeInput(symbol);
    const market = inferMarket(symbol);
    const url = new URL("/api/markets/search", window.location.origin);
    url.searchParams.set("q", query);
    if (market) url.searchParams.set("market", market);

    let response = await fetch(url, { cache: "no-store" });
    let body = await response.json();

    let rows = (body.data ?? []) as MarketInstrument[];

    if (!rows.length && market === "indian-index") {
      url.searchParams.delete("market");
      response = await fetch(url, { cache: "no-store" });
      body = await response.json();
      rows = (body.data ?? []) as MarketInstrument[];
    }

    const selected = pickBest(rows, query, symbol);
    if (!selected) {
      throw new Error(`No live provider instrument found for ${query}`);
    }

    setInstrument(selected);
    return selected;
  }, [symbol]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const selected = instrument ?? (await resolveInstrument());
      const candleId = selected.id;
      const [candleResponse, quoteResponse] = await Promise.all([
        fetch(
          `/api/markets/${encodeURIComponent(candleId)}/candles?timeframe=${encodeURIComponent(timeframe)}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/markets/instrument/quote?id=${encodeURIComponent(selected.id)}&symbol=${encodeURIComponent(selected.symbol)}`,
          { cache: "no-store" },
        ),
      ]);

      const [candleBody, quoteBody] = await Promise.all([
        candleResponse.json(),
        quoteResponse.json(),
      ]);

      if (!candleResponse.ok) {
        throw new Error(
          candleBody.error?.message ?? "Provider candle request failed",
        );
      }

      const nextCandles = (candleBody.data?.candles ?? []) as Candle[];
      setCandles(nextCandles);
      setQuote(quoteResponse.ok ? (quoteBody.data ?? null) : null);
      setMessage(
        `${candleBody.data?.provider ?? quoteBody.data?.provider ?? "provider"} · ${nextCandles.length} candles`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Market chart unavailable",
      );
      setCandles([]);
    } finally {
      setRefreshing(false);
    }
  }, [instrument, resolveInstrument, timeframe]);

  useEffect(() => {
    setInstrument(null);
    setCandles([]);
  }, [symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // REST candles are only reconciled periodically.
    // Live prices arrive through Zerion's realtime WebSocket gateway.
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const livePrice =
    typeof realtimeQuote?.price === "number"
      ? realtimeQuote.price
      : typeof quote?.price === "number"
        ? quote.price
        : null;

  const renderedCandles = useMemo(() => {
    if (!candles.length || livePrice == null) return candles;

    const next = candles.map((candle) => ({ ...candle }));
    const last = next[next.length - 1];

    if (!last) return next;

    last.close = livePrice;
    last.high = Math.max(last.high, livePrice);
    last.low = Math.min(last.low, livePrice);

    if (typeof realtimeQuote?.volume === "number") {
      last.volume = realtimeQuote.volume;
    }

    return next;
  }, [candles, livePrice, realtimeQuote?.volume]);

  if (!renderedCandles.length) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-[#E6D8C3] bg-[#2F2A25]"
        style={{ minHeight: height }}
      >
        <div className="text-center text-sm text-[#2F2A25]">
          <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />
          <p>{message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="zx-secondary-action mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry provider
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#2F2A25]">
        <span>
          {instrument?.exchange} · {instrument?.symbol} · {message}
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="zx-secondary-action"
          disabled={refreshing}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <ZerionProChart
        candles={renderedCandles}
        symbol={instrument?.symbol ?? normalizeInput(symbol)}
        timeframe={timeframe}
        livePrice={livePrice}
        height={height}
      />
    </div>
  );
}

export const TradingViewAdvancedChart = memo(ZerionProviderChartImpl);
