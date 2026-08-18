"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Landmark,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

type Broker = "upstox" | "ctrader";

export function LiveTradingCommandCenter() {
  const [broker, setBroker] = useState<Broker>("upstox");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sync() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/live/account?broker=${broker}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Sync failed");
      setData(json.data ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(() => {
    if (!data) return [];
    if (broker === "upstox") {
      const positions = ((data.positions as { data?: unknown[] } | undefined)?.data ?? []).length;
      const holdings = ((data.holdings as { data?: unknown[] } | undefined)?.data ?? []).length;
      const orders = ((data.orders as { data?: unknown[] } | undefined)?.data ?? []).length;
      return [
        ["Open positions", positions],
        ["Holdings", holdings],
        ["Orders today", orders],
      ];
    }
    const accounts = (data.accounts as unknown[] | undefined)?.length ?? 0;
    return [["Authorized cTrader accounts", accounts]];
  }, [broker, data]);

  return (
    <div className="space-y-6">
      <section className="zx-command-hero">
        <div>
          <p className="eyebrow">Live trading command center</p>
          <h1>Your real account stays separate from paper trading.</h1>
          <p>
            Zerion reads broker state, builds proposals and keeps live execution
            behind user confirmation.
          </p>
        </div>
        <div className="zx-command-orb" aria-hidden="true">
          <Activity />
        </div>
      </section>

      <div className="zx-switch-grid">
        <button
          type="button"
          className={broker === "upstox" ? "is-active" : ""}
          onClick={() => {
            setBroker("upstox");
            setData(null);
          }}
        >
          <Landmark />
          <span>Indian Markets</span>
          <small>Upstox</small>
        </button>

        <button
          type="button"
          className={broker === "ctrader" ? "is-active" : ""}
          onClick={() => {
            setBroker("ctrader");
            setData(null);
          }}
        >
          <WalletCards />
          <span>Forex</span>
          <small>cTrader</small>
        </button>
      </div>

      <section className="zx-live-panel">
        <div className="zx-live-panel__head">
          <div>
            <p className="eyebrow">{broker === "upstox" ? "Upstox" : "cTrader"}</p>
            <h2>Live account state</h2>
          </div>
          <button className="zx-secondary-action" onClick={() => void sync()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {busy ? "Syncing…" : "Sync now"}
          </button>
        </div>

        {error ? <div className="zx-error-banner">{error}</div> : null}

        {!data ? (
          <div className="zx-empty-state">
            <ShieldCheck />
            <h3>Ready when you are</h3>
            <p>Sync the linked account to load live positions and account information.</p>
          </div>
        ) : (
          <div className="zx-stat-grid">
            {summary.map(([label, value]) => (
              <article key={String(label)}>
                <span>{label}</span>
                <strong>{String(value)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="zx-trust-strip">
        <ShieldCheck />
        <p>
          Paper P&amp;L and live P&amp;L are intentionally separate. A strategy
          signal does not become a live order until the user confirms the final
          proposal.
        </p>
      </div>
    </div>
  );
}
