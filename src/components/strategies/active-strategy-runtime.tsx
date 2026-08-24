"use client";

import { Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Deployment = {
  id: string;
  strategy_id: string;
  name: string;
  status: "active" | "paused" | "stopped" | "error";
  market: string;
  symbol: string;
  mode: string;
  last_evaluation_at?: string | null;
  last_signal?: string | null;
  last_action?: string | null;
  runtime_health?: string | null;
  runtime_error?: string | null;
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

  const evaluate = useCallback(async (deployment: Deployment) => {
    if (deployment.status !== "active") return;
    await fetch(`/api/algo/deployments/${deployment.id}/evaluate`, {
      method: "POST",
      cache: "no-store",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!rows.some((row) => row.status === "active")) return;
    const run = async () => {
      await Promise.all(
        rows
          .filter((row) => row.status === "active")
          .map((row) => evaluate(row)),
      );
      await load();
    };
    void run();
    const timer = window.setInterval(() => void run(), 30_000);
    return () => window.clearInterval(timer);
  }, [evaluate, load, rows]);

  async function setStatus(
    deployment: Deployment,
    status: "active" | "paused",
  ) {
    setBusy(deployment.id);
    setMessage("");
    try {
      const response = await fetch(`/api/algo/deployments/${deployment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Strategy update failed");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Strategy update failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeStrategy(deployment: Deployment) {
    if (!window.confirm(`Delete ${deployment.name} from your strategies?`))
      return;
    setBusy(deployment.id);
    try {
      const response = await fetch(
        `/api/strategies/${deployment.strategy_id}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Strategy delete failed");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Strategy delete failed",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length && !message) return null;

  return (
    <section className="rounded-2xl border border-[#E6D8C3] bg-[#F7F4ED] p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-sm">Installed strategy runtime</strong>
        <button className="zx-secondary-action" onClick={() => void load()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      <div className="grid gap-3">
        {rows.map((deployment) => (
          <article
            key={deployment.id}
            className="rounded-xl border border-[#E6D8C3] p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>{deployment.name}</strong>
                <p className="text-xs text-[#2F2A25]">
                  {deployment.mode} · {deployment.market} · {deployment.symbol}
                </p>
              </div>
              <span className="data-badge">
                {deployment.status} / {deployment.runtime_health ?? "idle"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
              <span>Last evaluation: {deployment.last_evaluation_at ? new Date(deployment.last_evaluation_at).toLocaleString() : "Never"}</span>
              <span>Signal: {deployment.last_signal ?? "—"}</span>
              <span>Action: {deployment.last_action ?? "—"}</span>
              <span className={deployment.runtime_error ? "negative" : ""}>
                {deployment.runtime_error ?? "Runtime healthy"}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {deployment.status === "active" ? (
                <button
                  className="zx-secondary-action"
                  disabled={busy === deployment.id}
                  onClick={() => void setStatus(deployment, "paused")}
                >
                  <Pause className="mr-1 h-3.5 w-3.5" /> Disable/Pause
                </button>
              ) : (
                <button
                  className="zx-primary-action"
                  disabled={busy === deployment.id}
                  onClick={() => void setStatus(deployment, "active")}
                >
                  <Play className="mr-1 h-3.5 w-3.5" /> Enable
                </button>
              )}
              <button
                className="zx-exit-action"
                disabled={busy === deployment.id}
                onClick={() => void removeStrategy(deployment)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </section>
  );
}
