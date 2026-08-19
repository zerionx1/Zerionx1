"use client";

import { useEffect, useState } from "react";

import { CandlestickChart } from "@/components/charts/candlestick-chart";
import type { Candle } from "@/types/market";

export function MarketChartPanel() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [status, setStatus] = useState("Loading Upstox candles…");

  useEffect(() => {
    let mounted = true;

    void fetch("/api/markets/NIFTY%2050/candles?timeframe=15m", {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "Candle load failed");
        return body;
      })
      .then((body) => {
        if (!mounted) return;
        setCandles(body.data?.candles ?? []);
        setStatus("Upstox · live account");
      })
      .catch((error) => {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Upstox candles unavailable");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Market workspace</p>
          <h2>NIFTY 50 · 15m</h2>
        </div>
        <span className="data-badge">{status}</span>
      </div>
      {candles.length ? (
        <CandlestickChart candles={candles} />
      ) : (
        <div className="chart-frame flex items-center justify-center">
          <p>{status}</p>
        </div>
      )}
    </section>
  );
}
