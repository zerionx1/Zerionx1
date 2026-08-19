"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Globe2,
  LoaderCircle,
  Radio,
} from "lucide-react";
import { useEffect, useState } from "react";

import { GlobalMarketSearch } from "@/components/markets/global-market-search";
import type { MarketKind, MarketOverviewItem } from "@/types/market";

const marketCards: {
  kind: MarketKind;
  label: string;
  description: string;
}[] = [
  { kind: "indian-equity", label: "Indian Equity", description: "NSE and BSE cash market" },
  { kind: "indian-index", label: "Indices", description: "Nifty, Bank Nifty and benchmarks" },
  { kind: "indian-futures", label: "Futures", description: "Index and stock derivatives" },
  { kind: "indian-options", label: "Options", description: "Option chains and contracts" },
  { kind: "commodity", label: "Commodities", description: "MCX metals and energy" },
  { kind: "crypto", label: "Crypto", description: "CoinDCX integration is next" },
  { kind: "forex", label: "Forex", description: "MT5 bridge integration is next" },
  { kind: "us-equity", label: "US Stocks", description: "Future provider integration" },
  { kind: "etf", label: "ETFs", description: "Exchange-traded funds" },
];

export function MultiMarketExplorer() {
  const [active, setActive] = useState<MarketKind>("indian-index");
  const [rows, setRows] = useState<MarketOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const load = () =>
      fetch(`/api/markets/overview?market=${active}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((body: { data?: MarketOverviewItem[] }) => {
          if (mounted) setRows(body.data ?? []);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });

    void load();
    const timer = window.setInterval(() => void load(), 2_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [active]);

  return (
    <div className="space-y-6">
      <GlobalMarketSearch />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {marketCards.map((card) => (
          <button
            type="button"
            key={card.kind}
            onClick={() => setActive(card.kind)}
            className={`group rounded-[24px] border p-4 text-left transition duration-300 ${
              active === card.kind
                ? "border-amber-100/40 bg-gradient-to-br from-amber-100/12 to-rose-300/5 shadow-[0_18px_60px_rgba(213,189,159,.12)]"
                : "border-white/8 bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <Globe2 className="h-5 w-5 text-amber-100" />
              <span className="text-[10px] uppercase tracking-[.2em] text-white/35">
                {card.kind}
              </span>
            </div>
            <strong className="mt-5 block text-lg">{card.label}</strong>
            <span className="mt-1 block text-sm text-white/45">
              {card.description}
            </span>
          </button>
        ))}
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[.24em] text-amber-100/70">
              Provider-backed instruments
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {marketCards.find((item) => item.kind === active)?.label}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/50">
            <Radio className="h-3.5 w-3.5" /> Real provider data only
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-44 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-amber-100" />
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {rows.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 rounded-2xl border border-white/8 bg-black/15 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong>{item.symbol}</strong>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/45">
                      {item.exchange}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/45">{item.displayName}</p>
                </div>

                {item.quote ? (
                  <div className="text-left sm:text-right">
                    <strong className="text-lg">
                      {item.currency} {item.quote.price.toLocaleString()}
                    </strong>
                    <span
                      className={`ml-3 inline-flex items-center text-sm ${
                        item.quote.changePercent >= 0
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {item.quote.changePercent >= 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {item.quote.changePercent.toFixed(2)}%
                    </span>
                    <p className="text-xs text-white/35">
                      {item.quote.delayed ? "Delayed provider" : "Upstox live"}
                    </p>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-sm text-white/40">
                    <Activity className="h-4 w-4" />
                    {active.startsWith("indian-")
                      ? "Waiting for Upstox live feed"
                      : "Provider integration pending"}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
