"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Play, ShieldCheck, Sparkles } from "lucide-react";
import {
  zerionStrategyTemplates,
  type ZerionStrategyTemplate,
} from "@/config/strategy-templates";
function build(t: ZerionStrategyTemplate, mode: "deploy" | "customize") {
  const now = new Date().toISOString();
  return {
    id: `strategy_${t.id}_${crypto.randomUUID()}`,
    ownerId: "resolved-server-side",
    name: t.name,
    description: t.description,
    markets: [t.market],
    symbols: [t.symbol],
    timeframe: t.timeframe,
    status: mode === "deploy" ? "paper-ready" : "draft",
    nodes: [
      {
        id: "source-1",
        kind: "source",
        label: t.symbol,
        x: 40,
        y: 120,
        config: { symbol: t.symbol },
      },
      {
        id: "indicator-1",
        kind: "indicator",
        label: t.rules[0] ?? "Indicator",
        x: 250,
        y: 90,
        config: { period: 20 },
      },
      {
        id: "condition-1",
        kind: "condition",
        label: t.rules[1] ?? "Confirmation",
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
    tags: [t.style.toLowerCase(), t.market],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}
type StrategyApiPayload = {
  error?: { message?: string };
  data?: { strategy?: { id?: string }; id?: string };
};
async function safePayload(r: Response): Promise<StrategyApiPayload> {
  const text = await r.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as StrategyApiPayload;
  } catch {
    return {
      error: { message: `Server returned an invalid response (${r.status})` },
    };
  }
}
export function StrategyTemplateGallery() {
  const router = useRouter(),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState("");
  async function act(t: ZerionStrategyTemplate, mode: "deploy" | "customize") {
    const key = `${t.id}:${mode}`;
    setBusy(key);
    setMessage("");
    try {
      const r = await fetch("/api/strategies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(build(t, mode)),
      });
      const j = await safePayload(r);
      if (!r.ok)
        throw new Error(
          j.error?.message ?? `Strategy save failed (${r.status})`,
        );
      const id = j.data?.strategy?.id ?? j.data?.id;
      if (!id) throw new Error("Strategy saved but no ID returned");
      router.push(
        mode === "customize"
          ? `/dashboard/strategies/${id}?mode=edit`
          : `/dashboard/strategies/${id}?mode=paper`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Strategy action failed");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow">READY STRATEGIES</p>
        <h2 className="mt-2 text-2xl font-semibold">Choose a starting point</h2>
        <p>
          Install creates a paper-ready strategy. Customize creates a draft and
          opens the editor.
        </p>
      </div>
      {message ? <div className="zx-error-banner">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zerionStrategyTemplates.map((t) => (
          <article className="zx-strategy-card" key={t.id}>
            <div className="flex justify-between">
              <Sparkles />
              <span className="data-badge">
                {t.market === "forex" ? "Forex" : "Indian Market"}
              </span>
            </div>
            <h3>{t.name}</h3>
            <p>{t.description}</p>
            <div className="zx-template-meta">
              <span>{t.symbol}</span>
              <span>{t.timeframe}</span>
              <span>{t.style}</span>
            </div>
            <p className="mt-4 flex gap-2 text-xs">
              <ShieldCheck className="h-4 w-4" />
              {t.risk}
            </p>
            <div className="zx-template-actions">
              <button
                className="zx-primary-action"
                disabled={!!busy}
                onClick={() => void act(t, "deploy")}
              >
                <Play className="mr-2 h-4 w-4" />
                {busy === `${t.id}:deploy` ? "Installing…" : "Install & Deploy"}
              </button>
              <button
                className="zx-secondary-action"
                disabled={!!busy}
                onClick={() => void act(t, "customize")}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {busy === `${t.id}:customize` ? "Opening…" : "Customize"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
