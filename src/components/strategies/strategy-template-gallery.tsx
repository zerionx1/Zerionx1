"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  zerionStrategyTemplates,
  type ZerionStrategyTemplate,
} from "@/config/strategy-templates";

function strategyPayload(
  template: ZerionStrategyTemplate,
  mode: "deploy" | "customize",
) {
  const now = new Date().toISOString();
  const id = `strategy_${template.id}_${crypto.randomUUID()}`;

  return {
    id,
    ownerId: "resolved-server-side",
    name: template.name,
    description: template.description,
    markets: [template.market],
    symbols: [template.symbol],
    timeframe: template.timeframe,
    status: mode === "deploy" ? "paper-ready" : "draft",
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
        label: template.rules[0] ?? "Trend filter",
        x: 260,
        y: 80,
        config: { period: 20 },
      },
      {
        id: "condition-1",
        kind: "condition",
        label: template.rules[1] ?? "Confirmation",
        x: 470,
        y: 100,
        config: { operator: "confirm" },
      },
      {
        id: "risk-1",
        kind: "risk",
        label: "Risk guard",
        x: 680,
        y: 160,
        config: { riskPct: 0.75 },
      },
      {
        id: "entry-1",
        kind: "entry",
        label: "Entry",
        x: 890,
        y: 100,
        config: { side: "long" },
      },
      {
        id: "exit-1",
        kind: "exit",
        label: "Risk-based exit",
        x: 1090,
        y: 100,
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

export function StrategyTemplateGallery() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function install(
    template: ZerionStrategyTemplate,
    mode: "deploy" | "customize",
  ) {
    const key = `${template.id}:${mode}`;
    setBusy(key);
    setMessage("");

    try {
      const payload = strategyPayload(template, mode);
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage(
          json.error?.message ?? "Strategy could not be installed.",
        );
        return;
      }

      const id = json.data?.strategy?.id ?? payload.id;
      router.push(`/dashboard/strategies/${id}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Ready strategy starting points</p>
          <h2 className="mt-2 text-2xl font-semibold">
            10 strategy templates
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Install &amp; Deploy for a fast start. Customize only when you want
            to edit the rules yourself.
          </p>
        </div>
        <span className="data-badge">Paper-first</span>
      </div>

      {message ? <div className="panel text-sm">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zerionStrategyTemplates.map((template) => (
          <article className="zx-strategy-card" key={template.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="x1-menu-icon">
                <Sparkles className="h-4 w-4" />
              </span>
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

            <div className="mt-4 flex flex-wrap gap-2">
              {template.rules.map((rule) => (
                <span className="zx-rule-chip" key={rule}>
                  {rule}
                </span>
              ))}
            </div>

            <p className="mt-4 flex gap-2 text-xs text-white/50">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {template.risk}
            </p>

            <div className="zx-template-actions">
              <button
                type="button"
                onClick={() => void install(template, "deploy")}
                disabled={busy !== null}
                className="zx-primary-action"
              >
                <Play className="mr-2 h-4 w-4" />
                {busy === `${template.id}:deploy`
                  ? "Installing…"
                  : "Install & Deploy"}
              </button>

              <button
                type="button"
                onClick={() => void install(template, "customize")}
                disabled={busy !== null}
                className="zx-secondary-action"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Customize
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
