"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import {
  ZerionProChart,
  type ChartPriceLine,
} from "@/components/charts/zerion-pro-chart";
import {
  useZerionFeedStatus,
  useZerionMarketStream,
} from "@/hooks/use-zerion-market-stream";
import { mergeLiveQuoteIntoCandles } from "@/lib/market-data/live-candle-builder";
import type { Candle, MarketInstrument, Timeframe } from "@/types/market";

export function ZerionProviderChart({
  instrument,
  symbol,
  timeframe,
  height = 700,
  priceLines = [],
  onExitPriceLine,
  exitBusyId = "",
}: {
  instrument: MarketInstrument | null;
  symbol: string;
  timeframe: Timeframe;
  height?: number;
  priceLines?: ChartPriceLine[];
  onExitPriceLine?: (line: ChartPriceLine) => void;
  exitBusyId?: string;
}) {
  const [resolved, setResolved] = useState<MarketInstrument | null>(instrument);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [message, setMessage] = useState("Resolving provider instrument…");
  const [loading, setLoading] = useState(false);
  const feed = useZerionFeedStatus();

  useEffect(() => setResolved(instrument), [instrument]);

  const resolve = useCallback(async () => {
    if (resolved) return resolved;

    const response = await fetch(
      `/api/markets/search?q=${encodeURIComponent(symbol)}`,
      { cache: "no-store" },
    );
    const body = await response.json();
    const rows = (body.data ?? []) as MarketInstrument[];
    const selected = rows.find(
      (row) => row.id.startsWith("upstox:") || row.id.startsWith("coindcx:"),
    );

    if (!selected) {
      throw new Error(`No provider-backed instrument found for ${symbol}`);
    }

    setResolved(selected);
    return selected;
  }, [resolved, symbol]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const selected = await resolve();
      const response = await fetch(
        `/api/markets/${encodeURIComponent(
          selected.id,
        )}/candles?timeframe=${encodeURIComponent(timeframe)}`,
        { cache: "no-store" },
      );
      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error?.message ?? "Historical candles unavailable",
        );
      }

      const next = (body.data?.candles ?? []) as Candle[];
      setCandles(next);
      setMessage(
        `${body.data?.provider ?? "provider"} · ${next.length} historical candles`,
      );
    } catch (error) {
      setCandles([]);
      setMessage(
        error instanceof Error ? error.message : "Chart unavailable",
      );
    } finally {
      setLoading(false);
    }
  }, [resolve, timeframe]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const keys = useMemo(
    () => (resolved ? [resolved.id, resolved.symbol] : []),
    [resolved],
  );
  const quotes = useZerionMarketStream(keys);

  const live = resolved
    ? quotes[resolved.id.toUpperCase()] ??
      quotes[resolved.symbol.toUpperCase()]
    : undefined;

  useEffect(() => {
    if (!live) return;
    setCandles((current) =>
      mergeLiveQuoteIntoCandles(current, live, timeframe),
    );
  }, [live, timeframe]);

  if (!candles.length) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-[#151a1d]">
        <div className="text-center text-sm text-white/55">
          <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />
          <p>{message}</p>
          <button
            className="zx-secondary-action mt-4"
            onClick={() => void loadHistory()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
        <span>
          {resolved?.exchange} · {resolved?.symbol} · {message}
        </span>
        <span className="status-pill">{feed.status}</span>
        <button
          className="zx-secondary-action"
          disabled={loading}
          onClick={() => void loadHistory()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? "Refreshing…" : "Refresh history"}
        </button>
      </div>

      <ZerionProChart
        candles={candles}
        symbol={resolved?.symbol ?? symbol}
        timeframe={timeframe}
        livePrice={live?.price ?? candles.at(-1)?.close ?? null}
        priceLines={priceLines}
        instrumentId={resolved?.id ?? symbol}
        height={height}
        onExitPriceLine={onExitPriceLine}
        exitBusyId={exitBusyId}
      />
    </div>
  );
}
