"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  directionOf,
  displayNumber,
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

type ApiBody = {
  data?: { message?: string };
  error?: {
    code?: string;
    message?: string;
    details?: {
      proposedNotional?: number;
      defaultGuardNotional?: number;
      defaultGuardPercent?: number;
      userRiskBudget?: number;
      quantity?: number;
      symbol?: string;
    };
  };
};

function amount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
}

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
    const poll = window.setInterval(() => void load(), 15_000);
    const refresh = () => void load();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
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

  async function submitApproval(row: NotificationRow, riskOverrideConfirmed: boolean) {
    if (!row.opportunity_id) return false;
    const r = await fetch(
      `/api/agents/opportunities/${encodeURIComponent(row.opportunity_id)}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          mode,
          autoTrailing,
          riskOverrideConfirmed,
        }),
      },
    );
    const j = (await r.json().catch(() => ({}))) as ApiBody;

    if (r.status === 409 && j.error?.code === "RISK_CONFIRMATION_REQUIRED") {
      const d = j.error.details ?? {};
      const accepted = window.confirm(
        `Risk confirmation required for ${d.symbol ?? "this trade"}.\n\n` +
          `Your saved risk sizing produced order notional ${amount(d.proposedNotional)}.\n` +
          `Zerion's default paper guard is ${amount(d.defaultGuardNotional)} (${amount(d.defaultGuardPercent)}%).\n` +
          `Your calculated max-loss budget remains ${amount(d.userRiskBudget)}.\n\n` +
          `Continue with YOUR saved risk settings anyway?`,
      );
      if (!accepted) {
        setMessage("Trade not executed. Your risk confirmation was not given.");
        return false;
      }
      return submitApproval(row, true);
    }

    setMessage(r.ok ? j.data?.message ?? "Trade executed." : j.error?.message ?? "Execution failed.");
    if (!r.ok) return false;

    await fetch("/api/notifications/inbox", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    window.location.href = "/dashboard/positions";
    return true;
  }

  async function approve(row: NotificationRow) {
    if (!row.opportunity_id) return;
    const data = row.event_data ?? {};
    if (isOpportunityExpired(data, Date.now())) {
      setMessage("This setup is stale. Zerion is continuously scanning for a fresh qualified setup.");
      void load();
      return;
    }
    const side = directionOf(data) || "TRADE";
    const symbol = String(data.symbol ?? row.title);
    if (
      !window.confirm(
        `Approve and EXECUTE ${mode.toUpperCase()} ${side} ${symbol}? Zerion will use your saved risk controls and send Entry + SL + minimum 1:3 target.`,
      )
    ) {
      return;
    }

    setBusy(row.id);
    setMessage("");
    try {
      await submitApproval(row, false);
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
            Zerion re-checks the market continuously. Only the strongest currently-qualified setup is shown;
            no qualified structure means no trade.
          </p>
        </div>
        <div className="zx-agent-controls">
          <div className="zx-trade-mode">
            <button className={mode === "paper" ? "is-active" : ""} onClick={() => chooseMode("paper")}>Paper</button>
            <button className={mode === "live" ? "is-active" : ""} onClick={() => chooseMode("live")}>Real</button>
          </div>
          <label className="zx-auto-trailing-control">
            <input
              type="checkbox"
              checked={autoTrailing}
              onChange={(e) => {
                setAutoTrailing(e.target.checked);
                window.localStorage.setItem("zerion-auto-trailing", e.target.checked ? "on" : "off");
              }}
            />
            Auto trailing
          </label>
          <button className="zx-secondary-action" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </button>
        </div>
      </div>

      <div className="zx-live-scan-note">
        <RefreshCw className="h-4 w-4" /> Continuous revalidation active · background scan about every 30 seconds
      </div>

      {message ? <div className="zx-agent-message">{message}</div> : null}

      <div className="zx-agent-notification-list">
        {visible.map((row) => {
          const data = row.event_data ?? {};
          const side = directionOf(data);
          const expired = row.opportunity_id ? isOpportunityExpired(data, clock) : false;
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
                      {expired ? <ShieldAlert className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                      {expired
                        ? "Structure changed or expired · refreshing for a new setup"
                        : "Live structure · continuously revalidated while it remains qualified"}
                    </div>
                  </>
                ) : null}
                <small>{new Date(row.created_at).toLocaleString()}</small>
              </div>
              {row.opportunity_id ? (
                <div className="zx-agent-notification__actions">
                  <button className="zx-primary-action" disabled={expired || busy === row.id} onClick={() => void approve(row)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {expired ? "Refreshing" : busy === row.id ? "Executing…" : `Approve & execute ${mode}`}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
        {!visible.length ? (
          <div className="zx-agent-empty">Continuous scan active. No 70%+ confidence / qualified 1:3 setup right now.</div>
        ) : null}
      </div>
    </section>
  );
}
