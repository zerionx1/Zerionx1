"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketKind, Timeframe } from "@/types/market";
import type { StrategyDefinition, StrategyNode } from "@/types/strategy";

type Template = {
  key: string;
  name: string;
  description: string;
  market: MarketKind;
  symbol: string;
  timeframe: Timeframe;
  style: string;
  minCapital: number;
  risk: "Low" | "Moderate" | "High";
  nodes: StrategyNode[];
};

const templates: Template[] = [
  {
    key: "nifty-orb",
    name: "NIFTY Opening Range Breakout",
    description: "Opening range breakout with volume confirmation, ATR stop and daily loss guard.",
    market: "indian-index",
    symbol: "NSE:NIFTY50",
    timeframe: "5m",
    style: "Intraday momentum",
    minCapital: 100000,
    risk: "Moderate",
    nodes: [
      { id: "source", kind: "source", label: "NIFTY 5m candles", x: 40, y: 80, config: { source: "candles" } },
      { id: "range", kind: "indicator", label: "Opening range 15m", x: 250, y: 50, config: { minutes: 15 } },
      { id: "volume", kind: "condition", label: "Volume confirmation", x: 250, y: 170, config: { multiple: 1.4 } },
      { id: "entry", kind: "entry", label: "Range breakout", x: 480, y: 95, config: { operator: "crosses-above" } },
      { id: "risk", kind: "risk", label: "ATR protective stop", x: 480, y: 210, config: { atrMultiple: 1.8 } },
      { id: "exit", kind: "exit", label: "2.2R target", x: 700, y: 140, config: { riskMultiple: 2.2 } },
    ],
  },
  {
    key: "banknifty-trend",
    name: "BANKNIFTY Trend Rider",
    description: "EMA alignment plus ADX trend-strength confirmation and trailing risk management.",
    market: "indian-index",
    symbol: "NSE:BANKNIFTY",
    timeframe: "15m",
    style: "Trend following",
    minCapital: 150000,
    risk: "High",
    nodes: [
      { id: "source", kind: "source", label: "BANKNIFTY candles", x: 40, y: 80, config: { source: "candles" } },
      { id: "ema", kind: "indicator", label: "EMA 20 / 50", x: 250, y: 50, config: { fast: 20, slow: 50 } },
      { id: "adx", kind: "indicator", label: "ADX above 22", x: 250, y: 170, config: { period: 14, level: 22 } },
      { id: "entry", kind: "entry", label: "Trend continuation", x: 480, y: 100, config: { operator: "gt" } },
      { id: "risk", kind: "risk", label: "ATR stop", x: 480, y: 210, config: { atrMultiple: 2 } },
      { id: "exit", kind: "exit", label: "Trailing exit", x: 700, y: 145, config: { trailing: true } },
    ],
  },
  {
    key: "btc-breakout",
    name: "BTC Volatility Breakout",
    description: "24×7 crypto breakout model using Donchian range, relative volume and strict risk caps.",
    market: "crypto",
    symbol: "BTC/USDT",
    timeframe: "15m",
    style: "Crypto breakout",
    minCapital: 25000,
    risk: "Moderate",
    nodes: [
      { id: "source", kind: "source", label: "BTC/USDT candles", x: 40, y: 80, config: { source: "candles" } },
      { id: "donchian", kind: "indicator", label: "Donchian 20", x: 250, y: 50, config: { period: 20 } },
      { id: "rvol", kind: "condition", label: "Relative volume > 1.3", x: 250, y: 170, config: { multiple: 1.3 } },
      { id: "entry", kind: "entry", label: "Channel breakout", x: 480, y: 100, config: { operator: "crosses-above" } },
      { id: "risk", kind: "risk", label: "ATR 2× stop", x: 480, y: 210, config: { atrMultiple: 2 } },
      { id: "exit", kind: "exit", label: "2.5R target", x: 700, y: 145, config: { riskMultiple: 2.5 } },
    ],
  },
  {
    key: "eurusd-reversion",
    name: "EUR/USD Session Reversion",
    description: "London-session mean reversion with RSI recovery and volatility-aware position sizing.",
    market: "forex",
    symbol: "EUR/USD",
    timeframe: "15m",
    style: "Mean reversion",
    minCapital: 50000,
    risk: "Low",
    nodes: [
      { id: "source", kind: "source", label: "EUR/USD candles", x: 40, y: 80, config: { source: "candles" } },
      { id: "rsi", kind: "indicator", label: "RSI 14", x: 250, y: 50, config: { period: 14 } },
      { id: "session", kind: "condition", label: "London session", x: 250, y: 170, config: { session: "london" } },
      { id: "entry", kind: "entry", label: "RSI recovery", x: 480, y: 100, config: { level: 30 } },
      { id: "risk", kind: "risk", label: "Structure stop", x: 480, y: 210, config: { lookback: 12 } },
      { id: "exit", kind: "exit", label: "Mid-band exit", x: 700, y: 145, config: { level: 50 } },
    ],
  },
];

export function StrategyMarketplace() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState<"all" | MarketKind>("all");
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");

  const visible = useMemo(() => templates.filter((item) => {
    const matchesQuery = `${item.name} ${item.description} ${item.symbol}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (market === "all" || item.market === market);
  }), [market, query]);

  async function install(template: Template) {
    setBusy(template.key);
    setError("");
    const now = new Date().toISOString();
    const strategy: StrategyDefinition = {
      id: crypto.randomUUID(),
      ownerId: "current",
      name: template.name,
      description: template.description,
      markets: [template.market],
      symbols: [template.symbol],
      timeframe: template.timeframe,
      status: "draft",
      nodes: template.nodes,
      edges: template.nodes.slice(1).map((node, index) => ({
        id: `edge-${index}`,
        source: template.nodes[index]!.id,
        target: node.id,
      })),
      risk: {
        riskPerTradePct: template.risk === "High" ? 1.25 : template.risk === "Low" ? 0.5 : 1,
        maxDailyLossPct: 3,
        maxOpenPositions: 3,
        minRiskReward: 2,
        stopLossMode: "atr",
        takeProfitMode: "risk-multiple",
      },
      tags: ["marketplace", template.style.toLowerCase().replaceAll(" ", "-")],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const response = await fetch("/api/strategies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(strategy),
    });
    const payload = await response.json();
    setBusy(undefined);
    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to install strategy template.");
      return;
    }
    router.push(`/dashboard/strategies/${payload.data.strategy.id}`);
    router.refresh();
  }

  return <div className="space-y-6">
    <section className="panel overflow-hidden p-0">
      <div className="zip3-marketplace-hero p-6 md:p-9">
        <p className="eyebrow">Zerion curated marketplace</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold md:text-5xl">Production-minded strategy blueprints for every market.</h2>
        <p className="mt-4 max-w-2xl text-white/60">Install a template into your private workspace, customize the rules, validate it and run it through historical testing before paper deployment.</p>
      </div>
    </section>

    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <input className="luxury-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search strategy, symbol or trading style" />
      <div className="flex flex-wrap gap-2">
        {(["all", "indian-index", "crypto", "forex"] as const).map((item) => <button key={item} onClick={() => setMarket(item)} className={`luxury-filter ${market === item ? "luxury-filter--active" : ""}`}>{item.replaceAll("-", " ")}</button>)}
      </div>
    </div>

    {error ? <p role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</p> : null}

    <div className="grid gap-5 lg:grid-cols-2">
      {visible.map((template) => <article key={template.key} className="panel zip3-strategy-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-amber-100/45">{template.style}</p>
            <h3 className="mt-2 text-2xl font-semibold">{template.name}</h3>
          </div>
          <Badge>{template.risk} risk</Badge>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/60">{template.description}</p>
        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div className="luxury-stat"><span>Market</span><strong>{template.market.replaceAll("-", " ")}</strong></div>
          <div className="luxury-stat"><span>Timeframe</span><strong>{template.timeframe}</strong></div>
          <div className="luxury-stat"><span>Min capital</span><strong>₹{template.minCapital.toLocaleString("en-IN")}</strong></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{template.nodes.map((node) => <span key={node.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{node.label}</span>)}</div>
        <Button className="mt-6 w-full" disabled={busy === template.key} onClick={() => install(template)}>{busy === template.key ? "Installing…" : "Install & customize"}</Button>
      </article>)}
    </div>
  </div>;
}
