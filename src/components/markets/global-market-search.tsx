"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MarketInstrument, MarketKind } from "@/types/market";

const filters: [string, MarketKind | ""][] = [
  ["All", ""],
  ["India", "indian-equity"],
  ["Indices", "indian-index"],
  ["Futures", "indian-futures"],
  ["Options", "indian-options"],
  ["Crypto", "crypto"],
];

function providerFor(instrument: MarketInstrument) {
  if (instrument.id.startsWith("coindcx:")) return "CoinDCX";
  if (instrument.id.startsWith("upstox:")) return "Upstox";
  return "Provider";
}

function hrefFor(instrument: MarketInstrument) {
  const params = new URLSearchParams({
    instrument: instrument.id,
    symbol: instrument.symbol,
    tf: "5m",
  });
  return `/dashboard/charts?${params.toString()}`;
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
          `/api/markets/search?q=${encodeURIComponent(query)}${market ? `&market=${market}` : ""}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as { data?: MarketInstrument[] };
        setRows(
          (body.data ?? []).filter(
            (row) =>
              row.id.startsWith("upstox:") || row.id.startsWith("coindcx:"),
          ),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, market]);

  return (
    <section className="relative rounded-[24px] border border-black/10 bg-[#F7F4ED] p-4 text-[#2F2A25] shadow-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#F3F1EC] px-4">
        <Search className="h-5 w-5" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search TATA, TCS, RELIANCE, HDFC, NIFTY, BANKNIFTY, BTC, ETH, SOL…"
          className="h-14 min-w-0 flex-1 bg-transparent outline-none placeholder:text-black/35"
        />
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => setMarket(value)}
            className={`luxury-filter shrink-0 ${
              market === value ? "luxury-filter--active" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {query.trim() ? (
        <div className="mt-4 grid max-h-[430px] gap-2 overflow-y-auto sm:grid-cols-2">
          {rows.map((instrument) => (
            <button
              type="button"
              key={`${instrument.id}-${instrument.symbol}`}
              onClick={() =>
                onAdd ? onAdd(instrument) : router.push(hrefFor(instrument))
              }
              className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-black/10 p-4 text-left hover:bg-black/[.03]"
            >
              <div className="min-w-0">
                <strong className="block truncate">{instrument.symbol}</strong>
                <span className="block truncate text-xs opacity-55">
                  {instrument.displayName}
                </span>
                <span className="mt-1 block text-[10px] uppercase opacity-45">
                  {instrument.exchange} · {instrument.market.replaceAll("-", " ")}
                </span>
              </div>
              <span className="data-badge shrink-0">
                {providerFor(instrument)}
              </span>
            </button>
          ))}
          {!loading && rows.length === 0 ? (
            <p className="p-3 text-sm opacity-55">
              No supported Upstox/CoinDCX instrument matched.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
