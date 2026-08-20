"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type State = {
  state: "connected" | "auth-required" | "degraded" | "disconnected" | string;
  persisted: boolean;
  account?: Record<string, unknown> | null;
  lastSync?: string | null;
  tokenHealth?: string;
  feedHealth?: string;
};

export function UpstoxPersistentStatus() {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setMessage("");
    const response = await fetch("/api/brokers/status", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) {
      setState(body.data);
      return;
    }
    const details = body.error?.details;
    setState(details ?? { state: "degraded", persisted: true });
    setMessage(body.error?.message ?? "Upstox health check failed");
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!state) return null;
  const account = state.account ?? {};
  const name = String(
    account.user_name ?? account.user_id ?? account.email ?? "Upstox account",
  );

  return (
    <section className="panel mb-6">
      <div className="panel-header">
        <div>
          <p className="eyebrow">UPSTOX CONNECTION</p>
          <h2>{state.state === "connected" ? "Connected" : state.state}</h2>
        </div>
        <button className="zx-secondary-action" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh health
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="luxury-stat"><span>Account</span><strong>{name}</strong></div>
        <div className="luxury-stat"><span>Token health</span><strong>{state.tokenHealth ?? "unknown"}</strong></div>
        <div className="luxury-stat"><span>Feed health</span><strong>{state.feedHealth ?? "unknown"}</strong></div>
        <div className="luxury-stat"><span>Last sync</span><strong>{state.lastSync ? new Date(state.lastSync).toLocaleString() : "—"}</strong></div>
      </div>
      {state.state === "auth-required" ? (
        <p className="mt-4 text-sm">
          Stored connection exists, but Upstox authorization must be renewed.
          Use Reconnect/Link existing account below.
        </p>
      ) : null}
      {message ? <div className="zx-error-banner mt-4">{message}</div> : null}
    </section>
  );
}
