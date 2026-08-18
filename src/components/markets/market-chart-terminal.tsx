"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";

const symbols = [
  ["NIFTY 50","NSE:NIFTY","Indian Index"],
  ["BANK NIFTY","NSE:BANKNIFTY","Indian F&O"],
  ["FIN NIFTY","NSE:CNXFINANCE","Indian F&O"],
  ["RELIANCE","NSE:RELIANCE","Indian Equity"],
  ["TCS","NSE:TCS","Indian Equity"],
  ["HDFCBANK","NSE:HDFCBANK","Indian Equity"],
  ["EUR/USD","FX:EURUSD","Forex"],
  ["GBP/USD","FX:GBPUSD","Forex"],
  ["USD/JPY","FX:USDJPY","Forex"],
  ["XAU/USD","OANDA:XAUUSD","Forex"],
  ["BTC/USDT","BINANCE:BTCUSDT","Crypto"],
  ["ETH/USDT","BINANCE:ETHUSDT","Crypto"],
] as const;

export function MarketChartTerminal() {
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState<(typeof symbols)[number]>(symbols[0]!);
  const visible = useMemo(() => {
    const q=query.trim().toLowerCase();
    return q ? symbols.filter(row => `${row[0]} ${row[2]}`.toLowerCase().includes(q)) : symbols;
  },[query]);

  return <div className="space-y-5">
    <section className="panel">
      <label className="zx-chart-search"><Search className="h-4 w-4"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stock, pair, index or F&O segment"/></label>
      <div className="mt-4 flex flex-wrap gap-2">
        {visible.map(row => <button key={row[1]} className={selected[1]===row[1]?"zx-symbol-chip is-active":"zx-symbol-chip"} onClick={()=>setSelected(row)}>
          <strong>{row[0]}</strong><span>{row[2]}</span>
        </button>)}
      </div>
    </section>
    <section className="zx-terminal-shell">
      <div className="zx-terminal-head"><div><p className="eyebrow">{selected[2]}</p><h2>{selected[0]}</h2></div><span className="data-badge">TradingView chart tools</span></div>
      <TradingViewAdvancedChart symbol={selected[1]} height={820}/>
    </section>
  </div>;
}
