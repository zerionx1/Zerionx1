"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartIntelligenceLab } from "@/components/intelligence/chart-intelligence-lab";
import type { MarketInstrument } from "@/types/market";

type NewsItem = {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
};

type NewsPayload = {
  aggregateSentiment?: string;
  items?: NewsItem[];
};

type Fundamentals = {
  companyName?: string;
  currency?: string;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  epsTrailingTwelveMonths?: number | null;
  bookValue?: number | null;
  priceToBook?: number | null;
  dividendYield?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  regularMarketPrice?: number | null;
  source?: string;
};

type OptionSide = {
  ltp?: number | null;
  oi?: number;
  volume?: number;
  greeks?: {
    delta?: number | null;
    gamma?: number | null;
    theta?: number | null;
    vega?: number | null;
    iv?: number | null;
  };
};

type OptionPayload = {
  expiry?: string;
  underlyingPrice?: number | null;
  atm?: {
    strike?: number;
    call?: OptionSide | null;
    put?: OptionSide | null;
  } | null;
  metrics?: {
    pcr?: number | null;
    maxPain?: number | null;
    totalCallOi?: number;
    totalPutOi?: number;
  };
  payoff?: Array<{
    spot: number;
    longCall: number | null;
    longPut: number | null;
    longStraddle: number | null;
  }>;
};

function n(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";
}

function compact(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function MarketIntelligenceHub() {
  const [query, setQuery] = useState("NIFTY 50");
  const [selected, setSelected] = useState<MarketInstrument | null>(null);
  const [results, setResults] = useState<MarketInstrument[]>([]);
  const [news, setNews] = useState<NewsPayload>({});
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [options, setOptions] = useState<OptionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [fundError, setFundError] = useState("");
  const [optionError, setOptionError] = useState("");

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2 || selected?.symbol === value) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/markets/search?q=${encodeURIComponent(value)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((body) => setResults((body.data ?? []).slice(0, 12)))
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  async function analyse(item = selected) {
    const symbol = item?.symbol ?? query.trim();
    if (!symbol) return;

    setLoading(true);
    setFundError("");
    setOptionError("");

    const exchange = item?.exchange ?? "";

    const [newsResult, fundResult, optionResult] = await Promise.allSettled([
      fetch(`/api/intelligence/news?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/intelligence/fundamentals?symbol=${encodeURIComponent(
          symbol,
        )}&exchange=${encodeURIComponent(exchange)}`,
        { cache: "no-store" },
      ).then(async (r) => ({ ok: r.ok, body: await r.json() })),
      item?.id
        ? fetch(
            `/api/intelligence/options?instrumentKey=${encodeURIComponent(item.id)}`,
            { cache: "no-store" },
          ).then(async (r) => ({ ok: r.ok, body: await r.json() }))
        : Promise.resolve({ ok: false, body: {} }),
    ]);

    if (newsResult.status === "fulfilled") {
      setNews(newsResult.value.data ?? {});
    } else {
      setNews({});
    }

    if (
      fundResult.status === "fulfilled" &&
      fundResult.value.ok
    ) {
      setFundamentals(fundResult.value.body.data ?? null);
    } else {
      setFundamentals(null);
      setFundError("Fundamentals unavailable for this symbol.");
    }

    if (
      optionResult.status === "fulfilled" &&
      optionResult.value.ok
    ) {
      setOptions(optionResult.value.body.data ?? null);
    } else {
      setOptions(null);
      setOptionError("No provider-backed option chain for this instrument.");
    }

    setLoading(false);
  }

  useEffect(() => {
    void fetch(`/api/markets/search?q=${encodeURIComponent("NIFTY 50")}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((body) => {
        const first = (body.data ?? [])[0] as MarketInstrument | undefined;
        if (first) {
          setSelected(first);
          setQuery(first.symbol);
          void analyse(first);
        }
      })
      .catch(() => {});
    // Initial bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atm = options?.atm;
  const call = atm?.call;
  const put = atm?.put;

  const sentimentClass = useMemo(
    () => String(news.aggregateSentiment ?? "neutral").toLowerCase(),
    [news.aggregateSentiment],
  );

  return (
    <div className="zx-intel-shell zx-intel-light">
      <section className="zx-intel-search">
        <div>
          <p className="eyebrow">ZERION MARKET INTELLIGENCE</p>
          <h2>Analyse any supported market</h2>
          <p>
            Technical setup, live news context, fundamentals and provider-backed
            options analytics in one workspace.
          </p>
        </div>

        <div className="zx-intel-query">
          <div className="zx-intel-querybox">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
              placeholder="RELIANCE, NIFTY, BTC/USDT, XAUUSD…"
            />
            {results.length && !selected ? (
              <div className="zx-intel-results">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setQuery(item.symbol);
                      setResults([]);
                      void analyse(item);
                    }}
                  >
                    <span>
                      <strong>{item.symbol}</strong>
                      <small>{item.displayName}</small>
                    </span>
                    <em>{item.exchange}</em>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => void analyse()}>
            {loading ? "Analysing…" : "Analyse"}
          </button>
        </div>
      </section>

      <section className="zx-intel-grid">
        <article className="zx-intel-card">
          <span className="zx-intel-number">01</span>
          <h3>Technical & Risk Engine</h3>
          <p>
            Bidirectional LONG/SHORT scanner with entry, stop-loss, multi-target,
            trailing, max-risk and anti-overtrading logic.
          </p>
          <div className="zx-intel-status ready">FixPack 2 engine active</div>
        </article>

        <article className="zx-intel-card">
          <span className="zx-intel-number">02</span>
          <h3>Market News</h3>
          <p>
            Current market headlines analysed for context and directional tone.
          </p>
          <div className={`zx-intel-status ready ${sentimentClass}`}>
            {news.aggregateSentiment
              ? `Sentiment: ${news.aggregateSentiment}`
              : "Waiting for headlines"}
          </div>
        </article>

        <article className="zx-intel-card">
          <span className="zx-intel-number">03</span>
          <h3>Fundamentals</h3>
          <p>
            Market cap, valuation, EPS, book value, dividend and 52-week range
            from a live public provider when available.
          </p>
          <div className="zx-intel-status ready">
            {fundamentals ? "Live fundamentals loaded" : fundError || "Analyse a symbol"}
          </div>
        </article>

        <article className="zx-intel-card">
          <span className="zx-intel-number">04</span>
          <h3>Options Desk</h3>
          <p>
            Upstox option-chain analytics with Greeks, IV, PCR, max-pain, ATM
            contracts and payoff scenarios.
          </p>
          <div className="zx-intel-status ready">
            {options ? `Expiry ${options.expiry}` : optionError || "Select an F&O instrument"}
          </div>
        </article>
      </section>

      <section className="zx-intel-detail-grid">
        <article className="zx-intel-news">
          <div className="zx-intel-section-head">
            <div>
              <p className="eyebrow">FUNDAMENTAL ANALYSIS</p>
              <h3>{fundamentals?.companyName ?? query}</h3>
            </div>
          </div>

          {fundamentals ? (
            <div className="zx-metric-grid">
              <Metric label="Price" value={n(fundamentals.regularMarketPrice)} />
              <Metric label="Market cap" value={compact(fundamentals.marketCap)} />
              <Metric label="Trailing P/E" value={n(fundamentals.trailingPE)} />
              <Metric label="Forward P/E" value={n(fundamentals.forwardPE)} />
              <Metric label="EPS" value={n(fundamentals.epsTrailingTwelveMonths)} />
              <Metric label="Book value" value={n(fundamentals.bookValue)} />
              <Metric label="Price / Book" value={n(fundamentals.priceToBook)} />
              <Metric
                label="Dividend yield"
                value={
                  fundamentals.dividendYield == null
                    ? "—"
                    : `${n(fundamentals.dividendYield * 100)}%`
                }
              />
              <Metric label="52W High" value={n(fundamentals.fiftyTwoWeekHigh)} />
              <Metric label="52W Low" value={n(fundamentals.fiftyTwoWeekLow)} />
            </div>
          ) : (
            <p className="zx-intel-empty">{fundError || "No fundamentals loaded."}</p>
          )}
        </article>

        <article className="zx-intel-news">
          <div className="zx-intel-section-head">
            <div>
              <p className="eyebrow">OPTIONS / GREEKS / IV</p>
              <h3>
                {options
                  ? `ATM ${n(atm?.strike)} · ${options.expiry}`
                  : "Options Desk"}
              </h3>
            </div>
          </div>

          {options ? (
            <>
              <div className="zx-metric-grid">
                <Metric label="Underlying" value={n(options.underlyingPrice)} />
                <Metric label="PCR" value={n(options.metrics?.pcr, 3)} />
                <Metric label="Max Pain" value={n(options.metrics?.maxPain)} />
                <Metric label="Call IV" value={n(call?.greeks?.iv)} />
                <Metric label="Put IV" value={n(put?.greeks?.iv)} />
                <Metric label="Call Delta" value={n(call?.greeks?.delta, 4)} />
                <Metric label="Put Delta" value={n(put?.greeks?.delta, 4)} />
                <Metric label="Call Gamma" value={n(call?.greeks?.gamma, 5)} />
                <Metric label="Put Gamma" value={n(put?.greeks?.gamma, 5)} />
                <Metric label="Call Theta" value={n(call?.greeks?.theta, 4)} />
                <Metric label="Put Theta" value={n(put?.greeks?.theta, 4)} />
                <Metric label="Call Vega" value={n(call?.greeks?.vega, 4)} />
              </div>

              <div className="zx-payoff-wrap">
                <h4>Expiry payoff per unit</h4>
                <div className="zx-payoff-table">
                  <div className="head">
                    <span>Spot</span><span>Long Call</span><span>Long Put</span><span>Straddle</span>
                  </div>
                  {(options.payoff ?? []).map((row) => (
                    <div key={row.spot}>
                      <span>{n(row.spot)}</span>
                      <span>{n(row.longCall)}</span>
                      <span>{n(row.longPut)}</span>
                      <span>{n(row.longStraddle)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="zx-intel-empty">{optionError || "No options data loaded."}</p>
          )}
        </article>
      </section>

      <section className="zx-intel-news">
        <div className="zx-intel-section-head">
          <div>
            <p className="eyebrow">LIVE MARKET NEWS</p>
            <h3>{query.toUpperCase()} context</h3>
          </div>
          <button type="button" onClick={() => void analyse()}>
            Refresh
          </button>
        </div>

        <div className="zx-news-list">
          {(news.items ?? []).slice(0, 10).map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <div>
                <span className={`zx-news-tone ${item.sentiment}`}>
                  {item.sentiment}
                </span>
                <strong>{item.title}</strong>
              </div>
              <small>
                {item.source}
                {item.publishedAt ? ` · ${item.publishedAt}` : ""}
              </small>
            </article>
          ))}
          {!loading && !(news.items ?? []).length ? (
            <p className="zx-intel-empty">No current headlines returned.</p>
          ) : null}
        </div>
      </section>

      <section className="zx-intel-chart-lab">
        <div className="zx-intel-section-head">
          <div>
            <p className="eyebrow">AI CHART INTELLIGENCE</p>
            <h3>Market scenario analysis</h3>
          </div>
        </div>
        <ChartIntelligenceLab />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="zx-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
