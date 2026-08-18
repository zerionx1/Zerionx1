"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";
const presets = [
  ["NIFTY 50", "NSE:NIFTY", "Index"],
  ["BANK NIFTY", "NSE:BANKNIFTY", "F&O"],
  ["FIN NIFTY", "NSE:CNXFINANCE", "F&O"],
  ["RELIANCE", "NSE:RELIANCE", "Equity"],
  ["TCS", "NSE:TCS", "Equity"],
  ["EUR/USD", "FX:EURUSD", "Forex"],
  ["XAU/USD", "OANDA:XAUUSD", "Forex"],
  ["BTC/USDT", "BINANCE:BTCUSDT", "Crypto"],
  ["ETH/USDT", "BINANCE:ETHUSDT", "Crypto"],
] as const;
const frames = ["1", "5", "15", "30", "60", "240", "D", "W"] as const;
export function MarketChartTerminal() {
  const [q, setQ] = useState("");
  const [symbol, setSymbol] = useState("NSE:NIFTY");
  const [label, setLabel] = useState("NIFTY 50");
  const [interval, setInterval] = useState("15");
  const visible = useMemo(() => {
    const x = q.trim().toLowerCase();
    return x
      ? presets.filter((r) =>
          `${r[0]} ${r[1]} ${r[2]}`.toLowerCase().includes(x),
        )
      : presets;
  }, [q]);
  function openCustom() {
    const x = q.trim().toUpperCase();
    if (!x) return;
    setSymbol(x);
    setLabel(x);
  }
  return (
    <div className="zx-chart-workspace">
      <section className="zx-chart-commandbar">
        <div className="zx-chart-search">
          <Search className="h-4 w-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") openCustom();
            }}
            placeholder="Search or enter TradingView symbol e.g. NSE:RELIANCE, OANDA:XAUUSD"
          />
          <button className="zx-secondary-action" onClick={openCustom}>
            Open
          </button>
        </div>
        <div className="zx-chart-timeframes">
          {frames.map((x) => (
            <button
              key={x}
              onClick={() => setInterval(x)}
              className={interval === x ? "is-active" : ""}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <div className="zx-chart-preset-strip">
        {visible.slice(0, 12).map((r) => (
          <button
            key={r[1]}
            onClick={() => {
              setSymbol(r[1]);
              setLabel(r[0]);
              setQ("");
            }}
            className={symbol === r[1] ? "is-active" : ""}
          >
            <strong>{r[0]}</strong>
            <small>{r[2]}</small>
          </button>
        ))}
      </div>
      <section className="zx-chart-stage">
        <header>
          <div>
            <p className="eyebrow">ZERION ANALYSIS WORKSPACE</p>
            <h2>{label}</h2>
          </div>
          <span className="data-badge">
            Realtime tools depend on provider/TradingView feed
          </span>
        </header>
        <TradingViewAdvancedChart
          symbol={symbol}
          interval={interval}
          height={900}
        />
      </section>
      <section className="zx-chart-actions">
        <Link href="/dashboard/strategies">
          <Sparkles />
          Strategies
        </Link>
        <Link href="/dashboard/backtests">
          <BarChart3 />
          Backtest
        </Link>
        <Link href="/dashboard/paper">
          <WalletCards />
          Paper trade
        </Link>
        <Link href="/dashboard/risk">
          <ShieldCheck />
          Risk controls
        </Link>
      </section>
    </div>
  );
}
