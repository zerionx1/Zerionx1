"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Deployment = {
  id: string;
  strategy_id: string;
  name: string;
  status: "active" | "paused" | "stopped" | "error";
  market: string;
  symbol: string;
  mode: string;
};

export function ActiveStrategyRuntime({ symbol }: { symbol?: string }) {
  const [rows, setRows] = useState<Deployment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/algo/deployments", { cache: "no-store" });
    const body = await response.json();
    const deployments = (body.data?.deployments ?? []) as Deployment[];

    setRows(
      symbol
        ? deployments.filter(
            (item) =>
              item.symbol.toUpperCase() === symbol.toUpperCase() ||
              item.status === "active",
          )
        : deployments,
    );
  }, [symbol]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(deployment: Deployment, status: "active" | "paused") {
    setBusy(deployment.id);
    setMessage("");
    try {
      const response = await fetch(`/api/algo/deployments/${deployment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Strategy update failed");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Strategy update failed");
    } finally {
      setBusy(null);
    }
  }

  async function removeStrategy(deployment: Deployment) {
    if (!window.confirm(`Delete ${deployment.name} from your strategies?`)) return;
    setBusy(deployment.id);
    setMessage("");
    try {
      const response = await fetch(`/api/strategies/${deployment.strategy_id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Strategy delete failed");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Strategy delete failed");
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length && !message) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="mr-2 text-sm">Strategies on chart</strong>
        {rows.map((deployment) => (
          <div key={deployment.id} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
            <span className="text-xs">{deployment.name} · {deployment.status}</span>
            {deployment.status === "active" ? (
              <button type="button" title="Disable strategy" disabled={busy === deployment.id} onClick={() => void setStatus(deployment, "paused")}>
                <Pause className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" title="Enable strategy" disabled={busy === deployment.id} onClick={() => void setStatus(deployment, "active")}>
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" title="Delete strategy" disabled={busy === deployment.id} onClick={() => void removeStrategy(deployment)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {message ? <p className="mt-2 text-xs text-amber-100/70">{message}</p> : null}
    </section>
  );
}
