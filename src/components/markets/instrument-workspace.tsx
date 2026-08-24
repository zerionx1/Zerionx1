"use client";

import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CandlestickChart } from "@/components/charts/candlestick-chart";
import { ActiveStrategyRuntime } from "@/components/strategies/active-strategy-runtime";
import type { Candle, MarketInstrument } from "@/types/market";

type Quote = {
  provider: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume?: number;
  timestamp: string;
};

export function InstrumentWorkspace({
  initialId,
  symbol,
  name,
  market,
  exchange,
}: {
  initialId: string;
  symbol: string;
  name: string;
  market: string;
  exchange: string;
}) {
  const router = useRouter();
  const [resolvedId, setResolvedId] = useState(initialId);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState("15m");
  const [status, setStatus] = useState("Resolving provider instrument…");

  const providerReady =
    resolvedId.startsWith("upstox:") || resolvedId.startsWith("coindcx:");

  const resolve = useCallback(async () => {
    if (providerReady) return resolvedId;

    const expectedMarket = market || "indian-equity";
    const response = await fetch(
      `/api/markets/search?q=${encodeURIComponent(symbol)}&market=${encodeURIComponent(expectedMarket)}`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as { data?: MarketInstrument[] };
    const provider = (body.data ?? []).find(
      (item) =>
        item.id.startsWith("upstox:") || item.id.startsWith("coindcx:"),
    );

    if (!provider) throw new Error("Provider instrument could not be resolved");
    setResolvedId(provider.id);
    return provider.id;
  }, [market, providerReady, resolvedId, symbol]);

  const load = useCallback(async () => {
    setStatus("Loading live quote and candles…");
    try {
      const id = await resolve();
      const [quoteResponse, candleResponse] = await Promise.all([
        fetch(
          `/api/markets/instrument/quote?id=${encodeURIComponent(id)}&symbol=${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/markets/${encodeURIComponent(id.replace(/^upstox:/, ""))}/candles?timeframe=${encodeURIComponent(timeframe)}`,
          { cache: "no-store" },
        ),
      ]);

      const [quoteBody, candleBody] = await Promise.all([
        quoteResponse.json(),
        candleResponse.json(),
      ]);

      if (quoteResponse.ok) setQuote(quoteBody.data ?? null);
      else setQuote(null);

      if (!candleResponse.ok) {
        throw new Error(candleBody.error?.message ?? "Candle provider unavailable");
      }

      setCandles(candleBody.data?.candles ?? []);
      setStatus(`${quoteBody.data?.provider ?? candleBody.data?.provider ?? "provider"} live`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Market data unavailable");
      setCandles([]);
    }
  }, [resolve, symbol, timeframe]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const title = useMemo(() => name || symbol || "Instrument", [name, symbol]);

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="zx-secondary-action mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Markets
          </button>
          <p className="eyebrow">{exchange || "Provider instrument"} · {market}</p>
          <h1>{title}</h1>
          <p>{symbol}</p>
        </div>
        <span className="status-pill">{status}</span>
      </div>

      {quote ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel"><span>Live price</span><strong className="mt-2 block text-2xl">{quote.price.toLocaleString()}</strong></div>
          <div className="panel"><span>Change</span><strong className={`mt-2 block text-2xl ${quote.change >= 0 ? "positive" : "negative"}`}>{quote.changePercent.toFixed(2)}%</strong></div>
          <div className="panel"><span>Day range</span><strong className="mt-2 block">{quote.low.toLocaleString()} — {quote.high.toLocaleString()}</strong></div>
          <div className="panel"><span>Provider</span><strong className="mt-2 block uppercase">{quote.provider}</strong></div>
        </div>
      ) : null}

      <ActiveStrategyRuntime symbol={symbol} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">LIVE MARKET CHART</p>
            <h2>{symbol} · {timeframe}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["1m", "5m", "15m", "30m", "1h", "4h", "1d"].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setTimeframe(value)}
                className={`luxury-filter ${timeframe === value ? "luxury-filter--active" : ""}`}
              >
                {value}
              </button>
            ))}
            <button type="button" onClick={() => void load()} className="zx-secondary-action">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-[380px] overflow-hidden rounded-[24px] border border-[#E6D8C3] bg-[#F7F4ED] p-3 md:min-h-[520px]">
          {candles.length ? (
            <div className="h-[360px] md:h-[500px] [&_.chart-frame]:h-full [&_.chart-frame_svg]:h-full [&_.chart-frame_svg]:w-full">
              <CandlestickChart candles={candles} />
            </div>
          ) : (
            <div className="flex h-[360px] items-center justify-center md:h-[500px]">
              <div className="text-center text-[#2F2A25]">
                <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />
                <p>{status}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
