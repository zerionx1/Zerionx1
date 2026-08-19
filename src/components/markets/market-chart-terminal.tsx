"use client";

import {
  BarChart3,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";
import type { MarketInstrument } from "@/types/market";

const frames = [
  ["1m", "1"],
  ["3m", "3"],
  ["5m", "5"],
  ["15m", "15"],
  ["30m", "30"],
  ["1h", "60"],
  ["4h", "240"],
  ["1D", "D"],
  ["1W", "W"],
] as const;

export function MarketChartTerminal() {
  const [query, setQuery] = useState("NIFTY 50");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MarketInstrument[]>([]);
  const [selected, setSelected] = useState<MarketInstrument | null>(null);
  const [interval, setInterval] = useState("15");

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/markets/search?q=${encodeURIComponent(value)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body = await response.json();
        setResults((body.data ?? []) as MarketInstrument[]);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const chartSymbol = useMemo(
    () => selected?.symbol ?? (query.trim() || "NIFTY 50"),
    [query, selected],
  );

  return (
    <div className="zx-chart-workspace space-y-4">
      <section className="zx-chart-commandbar">
        <div className="relative zx-chart-search">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
            }}
            placeholder="Search any Upstox stock, index, F&O contract or CoinDCX pair"
          />
          {searching ? (
            <span className="text-xs text-white/40">Searching…</span>
          ) : null}

          {results.length && !selected ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#151a1d] p-2 shadow-2xl">
              {results.slice(0, 30).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5"
                  onClick={() => {
                    setSelected(item);
                    setQuery(item.symbol);
                    setResults([]);
                  }}
                >
                  <span>
                    <strong className="block">{item.symbol}</strong>
                    <small className="text-white/45">{item.displayName}</small>
                  </span>
                  <span className="text-right text-[10px] uppercase text-white/35">
                    {item.exchange}
                    <br />
                    {item.market.replaceAll("-", " ")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="zx-chart-timeframes">
          {frames.map(([label, value]) => (
            <button
              key={value}
              onClick={() => setInterval(value)}
              className={interval === value ? "is-active" : ""}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="zx-chart-stage">
        <header>
          <div>
            <p className="eyebrow">ZERION X1 · OWN MARKET TERMINAL</p>
            <h2>{selected?.displayName ?? chartSymbol}</h2>
            <p className="mt-1 text-xs text-white/45">
              {selected
                ? `${selected.exchange} · ${selected.market.replaceAll("-", " ")} · ${selected.id.startsWith("coindcx:") ? "CoinDCX" : "Upstox"}`
                : "Resolve an instrument from provider search"}
            </p>
          </div>
          <span className="data-badge">
            Provider-backed · no external chart embed
          </span>
        </header>

        <TradingViewAdvancedChart
          symbol={selected?.symbol ?? chartSymbol}
          interval={interval}
          height={720}
        />
      </section>

      <section className="zx-chart-actions">
        <Link href="/dashboard/strategies">
          <Sparkles />
          Strategies
        </Link>
        <Link href="/dashboard/backtests">
          <BarChart3 />
          Backtest
        </Link>
        <Link href="/dashboard/paper">
          <WalletCards />
          Paper trade
        </Link>
        <Link href="/dashboard/risk">
          <ShieldCheck />
          Risk controls
        </Link>
      </section>
    </div>
  );
}
