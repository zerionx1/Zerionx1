"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";

type ViewMode = "all" | "paper" | "live";
type ExitKind = "paper" | "upstox" | "mt5" | "none";

type PositionRow = {
  id: string;
  mode: "paper" | "live";
  broker: string;
  market: string;
  symbol: string;
  side: string;
  quantity: number;
  entry: number;
  mark: number;
  pnl: number;
  stopLoss?: number;
  target?: number;
  trailing?: string;
  exitKind: ExitKind;
  exitRef?: string;
  product?: string;
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown) => String(v ?? "");

function paperRows(rows: Record<string, unknown>[]): PositionRow[] {
  return rows
    .filter((r) => n(r.quantity) !== 0)
    .map((r, i) => ({
      id: s(r.id) || `paper-${i}`,
      mode: "paper",
      broker: "Paper",
      market: s(r.market) || "paper",
      symbol: s(r.symbol),
      side: n(r.quantity) >= 0 ? "LONG" : "SHORT",
      quantity: n(r.quantity),
      entry: n(r.averagePrice),
      mark: n(r.markPrice),
      pnl: n(r.unrealizedPnl),
      stopLoss: n(r.stopLoss) || undefined,
      target: n(r.targetPrice) || undefined,
      trailing: "Paper risk controls",
      exitKind: "paper",
      exitRef: s(r.id),
    }));
}

function upstoxRows(rows: Record<string, unknown>[]): PositionRow[] {
  return rows
    .filter((r) => n(r.quantity ?? r.net_quantity) !== 0)
    .map((r, i) => {
      const q = n(r.quantity ?? r.net_quantity);
      const instrument = s(r.instrument_token ?? r.instrument_key);
      return {
        id: instrument || `up-${i}`,
        mode: "live",
        broker: "Upstox",
        market: "India",
        symbol: s(r.trading_symbol ?? r.tradingsymbol ?? r.symbol),
        side: q >= 0 ? "LONG" : "SHORT",
        quantity: q,
        entry: n(r.average_price ?? r.averagePrice ?? r.buy_price),
        mark: n(r.last_price ?? r.ltp ?? r.mark_price),
        pnl: n(r.pnl ?? r.unrealised),
        stopLoss: n(r.stop_loss ?? r.stopLoss) || undefined,
        target: n(r.target ?? r.target_price) || undefined,
        trailing: "Broker managed",
        exitKind: instrument ? "upstox" : "none",
        exitRef: instrument || undefined,
        product: s(r.product) || "I",
      };
    });
}

function mt5Rows(rows: Record<string, unknown>[]): PositionRow[] {
  return rows.map((r, i) => {
    const type = n(r.type);
    const q = n(r.volume);
    const ticket = s(r.ticket);
    return {
      id: ticket || `mt5-${i}`,
      mode: "live",
      broker: "Exness MT5",
      market: "Forex",
      symbol: s(r.symbol),
      side: type === 0 ? "LONG" : "SHORT",
      quantity: q,
      entry: n(r.price_open),
      mark: n(r.price_current),
      pnl: n(r.profit),
      stopLoss: n(r.sl) || undefined,
      target: n(r.tp) || undefined,
      trailing: "Dynamic / MT5",
      exitKind: ticket ? "mt5" : "none",
      exitRef: ticket || undefined,
    };
  });
}

function coinRows(rows: Record<string, unknown>[]): PositionRow[] {
  return rows
    .filter((r) => n(r.balance ?? r.available_balance ?? r.total_balance) > 0)
    .slice(0, 100)
    .map((r, i) => {
      const q = n(r.balance ?? r.available_balance ?? r.total_balance);
      return {
        id: s(r.currency ?? r.symbol) || `coin-${i}`,
        mode: "live",
        broker: "CoinDCX",
        market: "Crypto balance",
        symbol: s(r.currency ?? r.symbol),
        side: "HOLD",
        quantity: q,
        entry: 0,
        mark: 0,
        pnl: 0,
        trailing: "—",
        exitKind: "none",
      };
    });
}

export function UnifiedPositionsCenter() {
  const [mode, setMode] = useState<ViewMode>("all");
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [exitBusy, setExitBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const [paper, upstox, coindcx, mt5] = await Promise.allSettled([
        fetch("/api/paper/positions", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/live/account?broker=upstox", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/live/account?broker=coindcx", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/live/account?broker=exness-mt5", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const out: PositionRow[] = [];
      if (paper.status === "fulfilled" && Array.isArray(paper.value.data)) {
        out.push(...paperRows(paper.value.data));
      }
      if (upstox.status === "fulfilled") {
        const p = upstox.value.data?.positions?.data;
        if (Array.isArray(p)) out.push(...upstoxRows(p));
      }
      if (coindcx.status === "fulfilled") {
        const b = coindcx.value.data?.balances;
        const list = Array.isArray(b) ? b : Array.isArray(b?.data) ? b.data : [];
        out.push(...coinRows(list));
      }
      if (mt5.status === "fulfilled") {
        const p = mt5.value.data?.positions?.positions;
        if (Array.isArray(p)) out.push(...mt5Rows(p));
      }

      setRows(out);
      if (!out.length) {
        setMessage("No open paper or connected live positions right now.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => rows.filter((r) => mode === "all" || r.mode === mode),
    [rows, mode],
  );
  const paperPnl = rows
    .filter((r) => r.mode === "paper")
    .reduce((a, b) => a + b.pnl, 0);
  const livePnl = rows
    .filter((r) => r.mode === "live")
    .reduce((a, b) => a + b.pnl, 0);

  async function exitPosition(row: PositionRow) {
    if (row.exitKind === "none" || exitBusy) return;

    const confirmed = window.confirm(
      row.mode === "paper"
        ? `Exit paper ${row.symbol} now?`
        : `Exit REAL ${row.broker} ${row.symbol} position now? This sends a market square-off/close request.`,
    );
    if (!confirmed) return;

    setExitBusy(`${row.mode}-${row.broker}-${row.id}`);
    setMessage("");
    try {
      let response: Response;
      if (row.exitKind === "paper") {
        response = await fetch("/api/paper/positions/close", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ positionId: row.exitRef || row.id }),
        });
      } else if (row.exitKind === "upstox") {
        response = await fetch("/api/live/positions/exit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            broker: "upstox",
            instrumentToken: row.exitRef,
            quantity: row.quantity,
            product: row.product || "I",
          }),
        });
      } else {
        response = await fetch("/api/live/positions/exit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            broker: "exness-mt5",
            ticket: Number(row.exitRef),
            volume: Math.abs(row.quantity),
          }),
        });
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error?.message ?? body.message ?? "Position exit failed");
      }

      setMessage(`${row.symbol} exit request completed. Syncing positions…`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Position exit failed");
    } finally {
      setExitBusy("");
    }
  }

  return (
    <div className="space-y-5 zx-positions-center">
      <section className="zx-position-summary x1-luxury-panel">
        <div className="x1-panel-heading">
          <div>
            <span className="x1-kicker">Unified exposure</span>
            <h3>{rows.length} open holdings / positions</h3>
          </div>
        </div>
        <div className="x1-summary-list">
          <div><span>Paper P&amp;L</span><strong>{paperPnl.toFixed(2)}</strong></div>
          <div><span>Live P&amp;L</span><strong>{livePnl.toFixed(2)}</strong></div>
          <div><span>Live brokers</span><strong>{new Set(rows.filter((r) => r.mode === "live").map((r) => r.broker)).size}</strong></div>
        </div>
      </section>

      <section className="x1-luxury-panel">
        <div className="zx-position-toolbar">
          <div className="zx-position-tabs">
            {(["all", "paper", "live"] as const).map((v) => (
              <button key={v} className={mode === v ? "is-active" : ""} onClick={() => setMode(v)}>
                {v === "all" ? "All" : v === "paper" ? "Paper" : "Real"}
              </button>
            ))}
          </div>
          <button className="zx-secondary-action" onClick={() => void load()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {busy ? "Syncing…" : "Sync positions"}
          </button>
        </div>

        {message ? <div className="zx-agent-message">{message}</div> : null}

        <div className="zx-position-grid">
          {visible.map((row) => {
            const key = `${row.mode}-${row.broker}-${row.id}`;
            const canExit = row.exitKind !== "none";
            return (
              <article className="zx-position-card" key={key}>
                <div className="zx-position-card__top">
                  <div>
                    <strong>{row.symbol || "Unknown"}</strong>
                    <div className="zx-position-meta">
                      <span className="data-badge">{row.mode === "paper" ? "PAPER" : "REAL"}</span>
                      <span>{row.broker}</span>
                      <span>{row.market}</span>
                      <span>{row.side}</span>
                    </div>
                  </div>
                  <strong>{row.pnl >= 0 ? "+" : ""}{row.pnl.toFixed(2)}</strong>
                </div>

                <div className="zx-position-metrics">
                  <div><small>Quantity</small><strong>{row.quantity}</strong></div>
                  <div><small>Entry</small><strong>{row.entry || "—"}</strong></div>
                  <div><small>Current</small><strong>{row.mark || "—"}</strong></div>
                  <div><small>SL / Target</small><strong>{row.stopLoss ?? "—"} / {row.target ?? "—"}</strong></div>
                </div>

                <div className="zx-position-actions">
                  {canExit ? (
                    <button
                      type="button"
                      className="zx-position-exit"
                      disabled={exitBusy === key}
                      onClick={() => void exitPosition(row)}
                    >
                      <LogOut className="h-4 w-4" />
                      {exitBusy === key ? "Exiting…" : row.mode === "paper" ? "Exit paper position" : "Exit real position"}
                    </button>
                  ) : (
                    <small>CoinDCX wallet balance is shown as a holding, not an open margin position.</small>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {!visible.length ? (
          <div className="zx-position-empty">{message || "No positions in this view."}</div>
        ) : null}
      </section>
    </div>
  );
}
