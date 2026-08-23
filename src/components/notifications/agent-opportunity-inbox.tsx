"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  directionOf,
  displayNumber,
  expiryOf,
  isOpportunityExpired,
} from "@/lib/notifications/opportunity-display";

type NotificationRow = {
  id: string;
  opportunity_id?: string | null;
  title: string;
  body: string;
  kind?: string;
  priority: string;
  read_at?: string | null;
  created_at: string;
  action_url?: string | null;
  event_data?: Record<string, unknown> | null;
};
type TradeMode = "paper" | "live";

export function AgentOpportunityInbox() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [mode, setMode] = useState<TradeMode>("paper");
  const [autoTrailing, setAutoTrailing] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/notifications/inbox", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    setRows(j.data?.notifications ?? []);
  }, []);

  useEffect(() => {
    void load();
    const saved = window.localStorage.getItem("zerion-opportunity-mode");
    if (saved === "live") setMode("live");
    setAutoTrailing(window.localStorage.getItem("zerion-auto-trailing") === "on");
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  function chooseMode(v: TradeMode) {
    setMode(v);
    window.localStorage.setItem("zerion-opportunity-mode", v);
  }

  const visible = useMemo(() => {
    const active = rows.filter(
      (r) => r.opportunity_id && !isOpportunityExpired(r.event_data ?? {}, clock),
    );
    const others = rows.filter((r) => !r.opportunity_id);
    return [...active.slice(0, 1), ...others.slice(0, 8)];
  }, [rows, clock]);

  async function approve(row: NotificationRow) {
    if (!row.opportunity_id) return;
    const data = row.event_data ?? {};
    if (isOpportunityExpired(data, Date.now())) {
      setMessage("This setup expired. Zerion will wait for a fresh qualified setup.");
      return;
    }
    const side = directionOf(data) || "TRADE";
    const symbol = String(data.symbol ?? row.title);
    if (
      !window.confirm(
        `Approve and EXECUTE ${mode.toUpperCase()} ${side} ${symbol}? Zerion will risk-size the order and send Entry + SL + minimum 1:3 target immediately.`,
      )
    )
      return;

    setBusy(row.id);
    setMessage("");
    try {
      const r = await fetch(
        `/api/agents/opportunities/${encodeURIComponent(row.opportunity_id)}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmed: true, mode, autoTrailing }),
        },
      );
      const j = await r.json().catch(() => ({}));
      setMessage(
        r.ok
          ? j.data?.message ?? "Trade executed."
          : j.error?.message ?? "Execution failed.",
      );
      if (r.ok) {
        await fetch("/api/notifications/inbox", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: row.id }),
        });
        window.location.href = "/dashboard/positions";
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="x1-menu-group zx-agent-inbox">
      <div className="x1-panel-heading">
        <div>
          <span className="x1-kicker">ZERION INTELLIGENCE</span>
          <h3>Best qualified trade setup</h3>
          <p>
            One strongest setup at a time. No qualified structure means no trade.
            Approve once and Zerion sends the risk-sized order with SL and 1:3 target.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="zx-trade-mode">
            <button className={mode === "paper" ? "is-active" : ""} onClick={() => chooseMode("paper")}>Paper</button>
            <button className={mode === "live" ? "is-active" : ""} onClick={() => chooseMode("live")}>Real</button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoTrailing}
              onChange={(e) => {
                setAutoTrailing(e.target.checked);
                window.localStorage.setItem("zerion-auto-trailing", e.target.checked ? "on" : "off");
              }}
              style={{ width: 16, height: 16 }}
            />
            Auto trailing
          </label>
          <button className="zx-secondary-action" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </button>
        </div>
      </div>

      {message ? <div className="zx-agent-message">{message}</div> : null}

      <div className="zx-agent-notification-list">
        {visible.map((row) => {
          const data = row.event_data ?? {};
          const side = directionOf(data);
          const expiresAt = expiryOf(data);
          const expired = row.opportunity_id ? isOpportunityExpired(data, clock) : false;
          const remaining = expiresAt === null ? null : Math.max(0, expiresAt - clock);
          const SideIcon = side === "SELL" || side === "SHORT" ? TrendingDown : TrendingUp;
          return (
            <article key={row.id} className={`${row.read_at ? "zx-agent-notification" : "zx-agent-notification is-unread"} ${expired ? "is-expired" : ""}`}>
              <div className="zx-agent-notification__icon">{row.opportunity_id ? <SideIcon /> : <BellRing />}</div>
              <div className="zx-agent-notification__body">
                <div className="zx-agent-notification__title">
                  <strong>{row.title}</strong><span className="data-badge">{row.priority}</span>
                </div>
                <p>{row.body}</p>
                {row.opportunity_id ? (
                  <>
                    <div className="zx-trade-plan-title">{String(side || "TRADE")} {String(data.symbol ?? "")} · {displayNumber(data.entry)}</div>
                    <div className="zx-trade-grid">
                      <div><small>Entry</small><strong>{displayNumber(data.entry)}</strong></div>
                      <div><small>Stop loss</small><strong>{displayNumber(data.stopLoss ?? data.sl)}</strong></div>
                      <div><small>Target · 1:3</small><strong>{displayNumber(data.target ?? data.takeProfit ?? data.tp)}</strong></div>
                      <div><small>R:R</small><strong>1:{displayNumber(data.riskReward ?? data.rr)}</strong></div>
                      <div><small>Support</small><strong>{displayNumber(data.support)}</strong></div>
                      <div><small>Resistance</small><strong>{displayNumber(data.resistance)}</strong></div>
                      <div><small>Setup quality</small><strong>{displayNumber(data.qualityScore ?? data.confidence)}%</strong></div>
                      <div><small>Trailing</small><strong>{autoTrailing ? "Auto · market behaviour" : "Notify before move"}</strong></div>
                    </div>
                    <div className={`zx-expiry ${expired ? "is-expired" : ""}`}>
                      {expired ? <ShieldAlert className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      {expired
                        ? "Opportunity expired"
                        : remaining === null
                          ? "Valid while structure remains qualified"
                          : `Re-check in ${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s`}
                    </div>
                  </>
                ) : null}
                <small>{new Date(row.created_at).toLocaleString()}</small>
              </div>
              {row.opportunity_id ? (
                <div className="zx-agent-notification__actions">
                  <button className="zx-primary-action" disabled={expired || busy === row.id} onClick={() => void approve(row)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {expired ? "Expired" : busy === row.id ? "Executing…" : `Approve & execute ${mode}`}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
        {!visible.length ? <div className="zx-agent-empty">No fresh qualified setup right now.</div> : null}
      </div>
    </section>
  );
}
