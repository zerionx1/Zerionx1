"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { MarketInstrument, MarketKind } from "@/types/market";

const filters: [string, MarketKind | ""][] = [
  ["All", ""],
  ["India", "indian-equity"],
  ["Indices", "indian-index"],
  ["F&O", "indian-futures"],
  ["Crypto", "crypto"],
  ["Forex", "forex"],
  ["Commodities", "commodity"],
  ["US", "us-equity"],
];

function hrefFor(instrument: MarketInstrument) {
  const params = new URLSearchParams({
    id: instrument.id,
    symbol: instrument.symbol,
    name: instrument.displayName,
    market: instrument.market,
    exchange: instrument.exchange,
  });
  return `/dashboard/markets/instrument?${params.toString()}`;
}

export function GlobalMarketSearch({
  onAdd,
}: {
  onAdd?: (instrument: MarketInstrument) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState<MarketKind | "">("");
  const [rows, setRows] = useState<MarketInstrument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/markets/search?q=${encodeURIComponent(query)}${
            market ? `&market=${market}` : ""
          }`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as { data?: MarketInstrument[] };
        setRows(body.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, market]);

  return (
    <section className="relative rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4">
        <Search className="h-5 w-5 text-amber-100" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search TATA, RELIANCE, NIFTY, BTC, option contract…"
          className="h-14 min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/35"
        />
        {loading ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-white/50" />
        ) : null}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => setMarket(value)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              market === value
                ? "bg-amber-100 text-[#2F2A25]"
                : "border border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {query.trim() ? (
        <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {rows.map((instrument) => (
            <button
              type="button"
              key={`${instrument.id}-${instrument.symbol}`}
              onClick={() =>
                onAdd ? onAdd(instrument) : router.push(hrefFor(instrument))
              }
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/15 p-4 text-left transition hover:border-amber-100/30 hover:bg-white/[.06]"
            >
              <div className="min-w-0">
                <strong className="block truncate">{instrument.symbol}</strong>
                <span className="block truncate text-xs text-white/45">
                  {instrument.displayName} · {instrument.exchange}
                </span>
              </div>
              <span className="data-badge shrink-0">Open chart</span>
            </button>
          ))}
          {!loading && rows.length === 0 ? (
            <p className="p-3 text-sm text-white/45">
              No provider instrument matched this search.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
