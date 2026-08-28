"use client";

import Link from "next/link";
import { ShieldCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { readTradingContext, writeTradingContext } from "@/lib/dashboard/trading-context";
import type { MarketInstrument } from "@/types/market";

type Suggestion = {
  direction?: string;
  entry?: number;
  stopLoss?: number;
  target?: number;
  confidence?: number;
  strategy?: string;
  reason?: string;
};

type Props = {
  instrument: MarketInstrument | null;
  markPrice: number | null;
  suggestion?: Suggestion;
};

type Mode = "paper" | "live";
type Side = "buy" | "sell";

const valid = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;
const textNumber = (value: number | undefined | null) =>
  value != null && Number.isFinite(value) && value > 0 ? String(value) : "";

function providerFor(instrument: MarketInstrument | null) {
  if (!instrument) return "Provider";
  if (instrument.market === "crypto") return "CoinDCX";
  if (instrument.market === "forex") return "Exness MT5";
  return "Upstox";
}

function suggestedSide(direction: string | undefined): Side {
  const value = String(direction ?? "").toUpperCase();
  return value === "SELL" || value === "SHORT" ? "sell" : "buy";
}

export function ChartExecutionPanel({ instrument, markPrice, suggestion }: Props) {
  const [mode, setMode] = useState<Mode>("paper");
  const [side, setSide] = useState<Side>("buy");
  const [quantity, setQuantity] = useState("1");
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");
  const [autoTrailing, setAutoTrailing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const hydrating = useRef(false);
  const instrumentId = instrument?.id ?? "";

  // Restore Paper and Live independently. Never copy the currently visible mode into the other mode.
  useEffect(() => {
    hydrating.current = true;
    const saved = readTradingContext(mode);
    const sameInstrument = Boolean(instrumentId && saved?.instrumentId === instrumentId);
    if (sameInstrument) {
      setQuantity(saved?.quantity || "1");
      if (saved?.side === "buy" || saved?.side === "sell") setSide(saved.side);
      else setSide(suggestedSide(suggestion?.direction));
      setEntry(saved?.entryPrice || textNumber(suggestion?.entry));
      setStopLoss(saved?.stopLoss || textNumber(suggestion?.stopLoss));
      setTarget(saved?.targetPrice || textNumber(suggestion?.target));
    } else {
      setQuantity("1");
      setSide(suggestedSide(suggestion?.direction));
      setEntry(textNumber(suggestion?.entry));
      setStopLoss(textNumber(suggestion?.stopLoss));
      setTarget(textNumber(suggestion?.target));
    }
    setMessage("");
    queueMicrotask(() => { hydrating.current = false; });
  }, [instrumentId, mode, suggestion?.direction, suggestion?.entry, suggestion?.stopLoss, suggestion?.target]);

  // When an instrument has no active setup entry yet, seed entry once from the provider mark.
  // Subsequent live ticks never overwrite a user's editable entry field.
  useEffect(() => {
    if (!instrumentId || !(markPrice && markPrice > 0)) return;
    setEntry((current) => current || String(markPrice));
  }, [instrumentId, markPrice]);

  useEffect(() => {
    if (!instrument || hydrating.current) return;
    writeTradingContext(mode, {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      market: instrument.market,
      provider: providerFor(instrument),
      side,
      quantity,
      entryPrice: entry,
      stopLoss,
      targetPrice: target,
    });
  }, [entry, instrument, mode, quantity, side, stopLoss, target]);

  const rr = useMemo(() => {
    if (![entry, stopLoss, target].every(valid)) return null;
    const e = Number(entry), sl = Number(stopLoss), tp = Number(target);
    const risk = Math.abs(e - sl);
    return risk > 0 ? Math.abs(tp - e) / risk : null;
  }, [entry, stopLoss, target]);

  const geometryOk = useMemo(() => {
    if (![entry, stopLoss, target].every(valid)) return false;
    const e = Number(entry), sl = Number(stopLoss), tp = Number(target);
    return side === "buy" ? sl < e && tp > e : sl > e && tp < e;
  }, [entry, side, stopLoss, target]);

  async function submit(riskOverrideConfirmed = false) {
    if (!instrument) return;
    if (!valid(quantity) || !geometryOk || rr == null || rr < 3) {
      setMessage("Entry, SL and target must form valid trade geometry with at least 1:3 risk/reward.");
      return;
    }
    if (mode === "live" && !riskOverrideConfirmed) {
      const confirmed = window.confirm(
        `Send LIVE ${side.toUpperCase()} for ${instrument.symbol} via ${providerFor(instrument)}?\n\nQuantity ${quantity} · Entry ${entry} · SL ${stopLoss} · Target ${target}`,
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/chart/trade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          mode,
          instrumentId: instrument.id,
          symbol: instrument.symbol,
          market: instrument.market,
          side,
          quantity: Number(quantity),
          entry: Number(entry),
          stopLoss: Number(stopLoss),
          takeProfit: Number(target),
          autoTrailing,
          riskOverrideConfirmed,
          strategy: suggestion?.strategy ?? "Zerion chart manual execution",
          rationale: suggestion?.reason ?? "User-confirmed chart execution",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409 && body.error?.code === "RISK_CONFIRMATION_REQUIRED") {
        const confirmed = window.confirm(`${body.error?.message ?? "Risk confirmation required"}\n\nContinue with this quantity?`);
        if (confirmed) return void submit(true);
        setMessage("Trade not submitted.");
        return;
      }
      if (!response.ok) throw new Error(body.error?.message ?? "Execution failed");
      setMessage(body.data?.message ?? `${mode === "paper" ? "Paper" : "Live"} order submitted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="zx-chart-execution">
      <div className="zx-chart-execution__head">
        <div>
          <p className="eyebrow">CHART EXECUTION</p>
          <h3>{instrument?.symbol ?? "Select an instrument"}</h3>
          <p>{instrument ? `${providerFor(instrument)} · ${instrument.market.replaceAll("-", " ")}` : "Choose a provider-backed instrument above."}</p>
        </div>
        <div className="zx-chart-execution__mode">
          <button className={mode === "paper" ? "is-active" : ""} onClick={() => setMode("paper")}>Paper</button>
          <button className={mode === "live" ? "is-active" : ""} onClick={() => setMode("live")}>Live</button>
        </div>
      </div>

      <div className="zx-chart-execution__grid">
        <label>Side<select value={side} onChange={(e) => setSide(e.target.value as Side)}><option value="buy">Buy</option><option value="sell">Sell</option></select></label>
        <label>Quantity<input type="number" min="0.000001" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
        <label>Entry<input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} /></label>
        <label>Stop loss<input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} /></label>
        <label>Target<input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
        <div className="zx-chart-execution__rr"><span>Risk / Reward</span><strong>{rr == null ? "—" : `1:${rr.toFixed(2)}`}</strong></div>
      </div>

      <div className="zx-chart-execution__basis">
        <div><small>Strategy / basis</small><strong>{suggestion?.strategy ?? "Manual chart execution"}</strong></div>
        <p>{suggestion?.reason ?? "Enter your own risk levels. Zerion validates trade geometry before submission."}</p>
      </div>

      <div className="zx-chart-execution__actions">
        <label><input type="checkbox" checked={autoTrailing} onChange={(e) => setAutoTrailing(e.target.checked)} /> Auto trailing where provider supports it</label>
        <button disabled={busy || !instrument} className={mode === "live" ? "zx-exit-action" : "zx-primary-action"} onClick={() => void submit(false)}>
          <Zap className="mr-2 h-4 w-4" />{busy ? "Submitting…" : mode === "live" ? `Confirm live via ${providerFor(instrument)}` : "Place paper trade"}
        </button>
      </div>

      {message ? <div className="zx-chart-execution__message">{message}</div> : null}
      <div className="zx-chart-execution__foot"><ShieldCheck className="h-4 w-4" /><span>Live submission always requires explicit user confirmation. Provider/broker validation remains authoritative.</span><Link href="/dashboard/positions">Positions</Link></div>
    </section>
  );
}
