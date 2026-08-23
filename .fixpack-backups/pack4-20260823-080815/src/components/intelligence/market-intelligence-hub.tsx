"use client";

import { useEffect, useState } from "react";
import { ChartIntelligenceLab } from "@/components/intelligence/chart-intelligence-lab";

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

export function MarketIntelligenceHub() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [news, setNews] = useState<NewsPayload>({});
  const [loading, setLoading] = useState(false);

  async function refreshNews(value = symbol) {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/intelligence/news?symbol=${encodeURIComponent(value)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      setNews(body.data ?? {});
    } catch {
      setNews({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshNews("NIFTY");
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="zx-intel-shell">
      <section className="zx-intel-search">
        <div>
          <p className="eyebrow">ZERION MARKET INTELLIGENCE</p>
          <h2>One workspace for analysis</h2>
          <p>
            Technical screening, news context, chart intelligence, fundamentals
            and options status without synthetic market values.
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void refreshNews();
          }}
        >
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="RELIANCE, NIFTY, BTC/USDT, XAUUSD…"
          />
          <button type="submit">{loading ? "Analysing…" : "Analyse"}</button>
        </form>
      </section>

      <section className="zx-intel-grid">
        <article className="zx-intel-card">
          <span className="zx-intel-number">01</span>
          <h3>Technical Screener</h3>
          <p>
            LONG, SHORT and neutral opportunity engine with entry, stop,
            multi-targets, trailing and risk controls from FixPack 2.
          </p>
          <div className="zx-intel-status ready">Live engine</div>
        </article>

        <article className="zx-intel-card">
          <span className="zx-intel-number">02</span>
          <h3>Market News</h3>
          <p>
            Current headline context with conservative sentiment scoring.
          </p>
          <div className="zx-intel-status">
            {news.aggregateSentiment
              ? `Sentiment: ${news.aggregateSentiment}`
              : "Waiting for analysis"}
          </div>
        </article>

        <article className="zx-intel-card">
          <span className="zx-intel-number">03</span>
          <h3>Fundamentals</h3>
          <p>
            Ratios, balance sheet and peer comparison appear only when a
            licensed/provider-backed fundamentals source is connected.
          </p>
          <div className="zx-intel-status pending">Provider required</div>
        </article>

        <article className="zx-intel-card">
          <span className="zx-intel-number">04</span>
          <h3>Options Analysis</h3>
          <p>
            Greeks, IV, payoff and option-chain panels are reserved for
            provider-backed derivatives data; Zerion will not manufacture them.
          </p>
          <div className="zx-intel-status pending">Data entitlement required</div>
        </article>
      </section>

      <section className="zx-intel-news">
        <div className="zx-intel-section-head">
          <div>
            <p className="eyebrow">LIVE CONTEXT</p>
            <h3>{symbol.toUpperCase()} news analysis</h3>
          </div>
          <button type="button" onClick={() => void refreshNews()}>
            Refresh
          </button>
        </div>

        <div className="zx-news-list">
          {(news.items ?? []).slice(0, 8).map((item, index) => (
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
            <h3>Scenario analysis</h3>
          </div>
        </div>
        <ChartIntelligenceLab />
      </section>
    </div>
  );
}
