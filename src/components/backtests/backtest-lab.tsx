"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BacktestResult } from "@/types/backtest";
import type { StrategyDefinition } from "@/types/strategy";

type Props = { strategies: StrategyDefinition[]; history: BacktestResult[] };
type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

export function BacktestLab({ strategies, history: initialHistory }: Props) {
  const [strategyId, setStrategyId] = useState(strategies[0]?.id ?? "");
  const selected = useMemo(() => strategies.find((item) => item.id === strategyId), [strategies, strategyId]);
  const [symbol, setSymbol] = useState(selected?.symbols[0] ?? "BTC/USDT");
  const [market, setMarket] = useState(selected?.markets[0] ?? "crypto");
  const [timeframe, setTimeframe] = useState(selected?.timeframe ?? "15m");
  const [capital, setCapital] = useState(100000);
  const [commission, setCommission] = useState(5);
  const [slippage, setSlippage] = useState(3);
  const [allowShort, setAllowShort] = useState(false);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState(initialHistory);
  const [result, setResult] = useState<BacktestResult | undefined>(initialHistory[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    setSymbol(selected.symbols[0] ?? "");
    setMarket(selected.markets[0] ?? "crypto");
    setTimeframe(selected.timeframe);
  }, [selected]);

  async function run() {
    if (!selected) { setError("Create or install a strategy before running a backtest."); return; }
    setBusy(true); setError("");
    const response = await fetch("/api/backtests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        strategyId: selected.id,
        strategyVersion: selected.version,
        market,
        symbol,
        timeframe,
        startDate,
        endDate,
        assumptions: { initialCapital: capital, commissionBps: commission, slippageBps: slippage, latencyMs: 250, allowShort, maxPositionPct: 20 },
      }),
    });
    const payload = await response.json() as ApiEnvelope<{ result: BacktestResult }>;
    setBusy(false);
    if (!payload.ok) { setError(payload.error.message); return; }
    setResult(payload.data.result);
    setHistory((items) => [payload.data.result, ...items.filter((item) => item.id !== payload.data.result.id)]);
  }

  return <div className="grid gap-6 xl:grid-cols-[.9fr_1.4fr]">
    <section className="panel h-fit xl:sticky xl:top-24">
      <p className="eyebrow">Historical simulation</p><h2 className="mt-2 text-2xl font-semibold">Backtest configuration</h2>
      <div className="mt-6 grid gap-4">
        <Field label="Strategy"><select className="luxury-input" value={strategyId} onChange={(e) => setStrategyId(e.target.value)}><option value="">Select strategy</option>{strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name} · v{strategy.version}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Market"><select className="luxury-input" value={market} onChange={(e) => setMarket(e.target.value as typeof market)}><option value="indian-equity">Indian equity</option><option value="indian-index">Indian index</option><option value="crypto">Crypto</option><option value="forex">Forex</option></select></Field><Field label="Timeframe"><select className="luxury-input" value={timeframe} onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}>{["1m","5m","15m","30m","1h","4h","1d"].map((item)=><option key={item}>{item}</option>)}</select></Field></div>
        <Field label="Symbol"><input className="luxury-input" value={symbol} onChange={(e) => setSymbol(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Start"><input className="luxury-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field><Field label="End"><input className="luxury-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field></div>
        <Field label="Initial capital"><input className="luxury-input" type="number" min="1000" value={capital} onChange={(e) => setCapital(Number(e.target.value))} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Commission bps"><input className="luxury-input" type="number" min="0" value={commission} onChange={(e) => setCommission(Number(e.target.value))} /></Field><Field label="Slippage bps"><input className="luxury-input" type="number" min="0" value={slippage} onChange={(e) => setSlippage(Number(e.target.value))} /></Field></div>
        <label className="flex items-center gap-3 text-sm text-[#2F2A25]"><input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} /> Allow short positions</label>
        {error ? <p role="alert" className="rounded-2xl border border-[#E6D8C3] bg-[#F7F4ED] p-4 text-sm text-[#2F2A25]">{error}</p> : null}
        <Button onClick={run} disabled={busy || !strategyId}>{busy ? "Running with live historical data…" : "Run backtest"}</Button>
        <p className="text-xs leading-5 text-[#2F2A25]">A result is saved only when the configured market-data provider returns at least 50 real candles. Zerion X1 does not fabricate historical performance.</p>
      </div>
    </section>

    <div className="space-y-6">
      {result?.metrics ? <ResultView result={result} /> : <section className="panel min-h-72 grid place-items-center text-center"><div><p className="text-5xl">⌁</p><h2 className="mt-4 text-2xl font-semibold">No completed simulation selected</h2><p className="mt-2 max-w-lg text-sm text-[#2F2A25]">Choose a strategy and a connected historical data source to calculate trades, drawdown and risk-adjusted metrics.</p></div></section>}
      <section className="panel"><div className="panel-header"><div><p className="eyebrow">Persistent history</p><h2 className="mt-2 text-2xl font-semibold">Saved backtests</h2></div><span className="data-badge">{history.length}</span></div><div className="mt-5 space-y-3">{history.length === 0 ? <p className="text-sm text-[#2F2A25]">Completed results will appear here after they are saved to your account.</p> : history.map((item) => <button key={item.id} onClick={() => setResult(item)} className="flex w-full items-center justify-between rounded-2xl border border-[#E6D8C3] p-4 text-left hover:bg-[#F7F4ED]"><div><strong>{item.request.symbol}</strong><p className="mt-1 text-xs text-[#2F2A25]">{item.request.timeframe} · {item.request.startDate} → {item.request.endDate}</p></div><div className="text-right"><span className="data-badge">{item.status}</span>{item.metrics ? <p className="mt-2 text-sm">{item.metrics.netProfitPct.toFixed(2)}%</p> : null}</div></button>)}</div></section>
    </div>
  </div>;
}

function ResultView({ result }: { result: BacktestResult }) {
  const m = result.metrics!;
  const stats = [["Net profit", `${m.netProfitPct.toFixed(2)}%`],["Win rate", `${m.winRate.toFixed(1)}%`],["Max drawdown", `${m.maxDrawdownPct.toFixed(2)}%`],["Profit factor", m.profitFactor.toFixed(2)],["Sharpe", m.sharpeRatio.toFixed(2)],["Total trades", String(m.totalTrades)]];
  const min = Math.min(...result.equityCurve.map((p) => p.equity)); const max = Math.max(...result.equityCurve.map((p) => p.equity)); const range = Math.max(max - min, 1);
  const points = result.equityCurve.map((point, index) => `${(index / Math.max(result.equityCurve.length - 1, 1)) * 100},${92 - ((point.equity - min) / range) * 78}`).join(" ");
  return <section className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stats.map(([label,value]) => <div key={label} className="luxury-stat panel"><span>{label}</span><strong className="text-xl">{value}</strong></div>)}</div><div className="panel"><div className="panel-header"><div><p className="eyebrow">Equity and drawdown</p><h2 className="mt-2 text-2xl font-semibold">Performance curve</h2></div><span className="data-badge">real candles</span></div><svg viewBox="0 0 100 100" className="mt-6 h-64 w-full overflow-visible" preserveAspectRatio="none"><defs><linearGradient id="zip3-equity" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E6D8C3" stopOpacity=".42"/><stop offset="1" stopColor="#E6D8C3" stopOpacity="0"/></linearGradient></defs><polyline points={`0,100 ${points} 100,100`} fill="url(#zip3-equity)" stroke="none"/><polyline points={points} fill="none" stroke="#E6D8C3" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/></svg></div><div className="panel overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-[#2F2A25]"><tr><th className="p-3">Side</th><th className="p-3">Entry</th><th className="p-3">Exit</th><th className="p-3">Qty</th><th className="p-3">Fees</th><th className="p-3">P&L</th><th className="p-3">Reason</th></tr></thead><tbody>{result.trades.slice(0,50).map((trade)=><tr key={trade.id} className="border-t border-[#E6D8C3]"><td className="p-3 uppercase">{trade.side}</td><td className="p-3">{trade.entryPrice.toFixed(2)}</td><td className="p-3">{trade.exitPrice.toFixed(2)}</td><td className="p-3">{trade.quantity}</td><td className="p-3">{trade.fees.toFixed(2)}</td><td className="p-3">{trade.pnl.toFixed(2)}</td><td className="p-3 text-[#2F2A25]">{trade.exitReason}</td></tr>)}</tbody></table></div>{result.warnings.length ? <div className="panel"><h3 className="font-semibold">Methodology warnings</h3><ul className="mt-3 space-y-2 text-sm text-[#2F2A25]">{result.warnings.map((warning)=><li key={warning}>• {warning}</li>)}</ul></div> : null}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm text-[#2F2A25]"><span>{label}</span>{children}</label>; }
