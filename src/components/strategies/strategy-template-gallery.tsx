"use client";

import { Play, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  zerionStrategyTemplates,
  type ZerionStrategyTemplate,
} from "@/config/strategy-templates";

function buildStrategy(template: ZerionStrategyTemplate) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ownerId: "resolved-server-side",
    name: template.name,
    description: template.description,
    markets: [template.market],
    symbols: [template.symbol],
    timeframe: template.timeframe,
    status: "paper-ready" as const,
    nodes: [
      {
        id: "source-1",
        kind: "source",
        label: template.symbol,
        x: 40,
        y: 120,
        config: { symbol: template.symbol },
      },
      {
        id: "indicator-1",
        kind: "indicator",
        label: template.rules[0] ?? "Indicator",
        x: 250,
        y: 90,
        config: { period: 20 },
      },
      {
        id: "condition-1",
        kind: "condition",
        label: template.rules[1] ?? "Confirmation",
        x: 470,
        y: 90,
        config: { operator: "confirm" },
      },
      {
        id: "risk-1",
        kind: "risk",
        label: "Risk guard",
        x: 690,
        y: 130,
        config: { riskPct: 0.75 },
      },
      {
        id: "entry-1",
        kind: "entry",
        label: "Entry",
        x: 900,
        y: 90,
        config: { side: "long" },
      },
      {
        id: "exit-1",
        kind: "exit",
        label: "Exit",
        x: 1110,
        y: 90,
        config: { riskMultiple: 2 },
      },
    ],
    edges: [
      { id: "e1", source: "source-1", target: "indicator-1" },
      { id: "e2", source: "indicator-1", target: "condition-1" },
      { id: "e3", source: "condition-1", target: "risk-1" },
      { id: "e4", source: "risk-1", target: "entry-1" },
      { id: "e5", source: "entry-1", target: "exit-1" },
    ],
    risk: {
      riskPerTradePct: 0.75,
      maxDailyLossPct: 3,
      maxOpenPositions: 3,
      minRiskReward: 1.5,
      stopLossMode: "atr",
      takeProfitMode: "risk-multiple",
    },
    tags: [template.style.toLowerCase(), template.market],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

type StrategyResponse = {
  data?: {
    strategy?: {
      id: string;
      name: string;
      markets: string[];
      symbols: string[];
      risk: unknown;
    };
  };
  error?: { message?: string };
};

export function StrategyTemplateGallery() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function install(template: ZerionStrategyTemplate) {
    setBusy(template.id);
    setMessage("");

    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildStrategy(template)),
      });

      const payload = (await response.json()) as StrategyResponse;
      if (!response.ok || !payload.data?.strategy) {
        throw new Error(
          payload.error?.message ?? `Strategy save failed (${response.status})`,
        );
      }

      const strategy = payload.data.strategy;
      const deploymentResponse = await fetch("/api/algo/deployments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: strategy.name,
          strategyId: strategy.id,
          mode: "paper",
          market: strategy.markets[0],
          symbol: strategy.symbols[0],
          capital: template.market === "forex" ? 50000 : 100000,
          autoStart: true,
          riskConfig: strategy.risk,
        }),
      });

      const deploymentPayload = await deploymentResponse.json();
      if (!deploymentResponse.ok) {
        throw new Error(
          deploymentPayload.error?.message ??
            "Strategy saved but deployment could not start",
        );
      }

      router.push(
        `/dashboard/charts?strategy=${encodeURIComponent(strategy.id)}&symbol=${encodeURIComponent(strategy.symbols[0] ?? "")}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Strategy installation failed",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow">READY STRATEGIES</p>
        <h2 className="mt-2 text-2xl font-semibold">
          Install a ready Zerion strategy
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Install creates a real strategy record and immediately enables its
          paper runtime. You can enable, pause or delete it from the chart
          runtime.
        </p>
      </div>

      {message ? <div className="zx-error-banner">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zerionStrategyTemplates.map((template) => (
          <article className="zx-strategy-card" key={template.id}>
            <div className="flex justify-between">
              <Sparkles />
              <span className="data-badge">
                {template.market === "forex" ? "Forex" : "Indian Market"}
              </span>
            </div>

            <h3>{template.name}</h3>
            <p>{template.description}</p>

            <div className="zx-template-meta">
              <span>{template.symbol}</span>
              <span>{template.timeframe}</span>
              <span>{template.style}</span>
            </div>

            <p className="mt-4 flex gap-2 text-xs">
              <ShieldCheck className="h-4 w-4" />
              {template.risk}
            </p>

            <button
              className="zx-primary-action mt-5 w-full"
              disabled={Boolean(busy)}
              onClick={() => void install(template)}
            >
              <Play className="mr-2 h-4 w-4" />
              {busy === template.id
                ? "Installing & enabling…"
                : "Install strategy"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
