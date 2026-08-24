"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Globe2,
  LoaderCircle,
  Radio,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GlobalMarketSearch } from "@/components/markets/global-market-search";
import type { MarketKind, MarketOverviewItem } from "@/types/market";

const marketCards: {
  kind: MarketKind;
  label: string;
  description: string;
}[] = [
  { kind: "indian-equity", label: "Indian Equity", description: "Search NSE/BSE stocks through Upstox" },
  { kind: "indian-index", label: "Indices", description: "Nifty, Bank Nifty and benchmarks" },
  { kind: "indian-futures", label: "Futures", description: "Search concrete NSE/BSE futures" },
  { kind: "indian-options", label: "Options", description: "Search strikes, CE/PE and expiries" },
  { kind: "commodity", label: "Commodities", description: "MCX instruments through provider search" },
  { kind: "crypto", label: "Crypto", description: "CoinDCX live markets" },
  { kind: "forex", label: "Forex", description: "Amplify/Exness connector phase pending" },
  { kind: "us-equity", label: "US Stocks", description: "Provider integration pending" },
  { kind: "etf", label: "ETFs", description: "Exchange-traded funds" },
];

function detailHref(item: MarketOverviewItem) {
  const params = new URLSearchParams({
    id: item.id,
    symbol: item.symbol,
    name: item.displayName,
    market: item.market,
    exchange: item.exchange,
  });
  return `/dashboard/markets/instrument?${params.toString()}`;
}

export function MultiMarketExplorer() {
  const router = useRouter();
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
    const timer = window.setInterval(() => void load(), 2_500);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [active]);

  return (
    <div className="zx-market-explorer space-y-6">
      <GlobalMarketSearch />

      <section className="zx-market-category-grid">
        {marketCards.map((card) => (
          <button
            type="button"
            key={card.kind}
            onClick={() => setActive(card.kind)}
            className={`zx-market-category-card ${
              active === card.kind ? "is-active" : ""
            }`}
          >
            <div className="zx-market-category-top">
              <Globe2 className="h-5 w-5" />
              <span>{card.kind}</span>
            </div>
            <strong>{card.label}</strong>
            <small>{card.description}</small>
          </button>
        ))}
      </section>

      <section className="zx-market-results-panel">
        <div className="zx-market-results-head">
          <div>
            <p className="x1-kicker">Provider-backed instruments</p>
            <h2>{marketCards.find((item) => item.kind === active)?.label}</h2>
          </div>
          <span className="data-badge">
            <Radio className="h-3.5 w-3.5" /> Real provider data only
          </span>
        </div>

        {loading ? (
          <div className="zx-market-loading">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="zx-market-result-list">
            {rows.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => router.push(detailHref(item))}
                className="zx-market-result-row"
              >
                <div>
                  <div className="zx-market-result-symbol">
                    <strong>{item.symbol}</strong>
                    <span>{item.exchange}</span>
                  </div>
                  <p>{item.displayName}</p>
                  <small>Open chart →</small>
                </div>

                {item.quote ? (
                  <div className="zx-market-result-quote">
                    <strong>
                      {item.currency} {item.quote.price.toLocaleString()}
                    </strong>
                    <span className={item.quote.changePercent >= 0 ? "zx-positive" : "zx-negative"}>
                      {item.quote.changePercent >= 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {item.quote.changePercent.toFixed(2)}%
                    </span>
                    <small>Provider live</small>
                  </div>
                ) : (
                  <div className="zx-market-result-empty">
                    <Activity className="h-4 w-4" />
                    Open to resolve live provider instrument
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
