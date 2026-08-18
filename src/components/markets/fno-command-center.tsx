"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { derivativeUniverse } from "@/config/derivatives-universe";
import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";

export function FnoCommandCenter() {
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState<(typeof derivativeUniverse)[number]>(derivativeUniverse[0]!);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return derivativeUniverse;
    return derivativeUniverse.filter(x =>
      `${x.label} ${x.underlying} ${x.segment} ${x.searchHint}`.toLowerCase().includes(q)
    );
  },[query]);

  return (
    <div className="zx19-fno">
      <section className="zx19-fno-hero">
        <div>
          <p className="eyebrow">INDIAN DERIVATIVES</p>
          <h2>Futures & Options</h2>
          <p>
            Browse index futures, index options and stock F&O. Exact live
            contracts, expiries, strikes and tradable instrument keys are
            resolved from the connected Upstox account/provider feed.
          </p>
        </div>
        <div className="zx19-search">
          <Search />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search NIFTY, BANK NIFTY, FIN NIFTY, stock F&O..." />
        </div>
      </section>

      <div className="zx19-fno-grid">
        <aside className="zx19-instrument-list">
          {visible.map(item=>(
            <button key={item.id} className={selected.id===item.id?"is-active":""} onClick={()=>setSelected(item)}>
              <strong>{item.label}</strong>
              <span>{item.segment.replaceAll("-"," ")}</span>
            </button>
          ))}
        </aside>
        <section className="zx19-fno-chart">
          <div className="zx19-fno-head">
            <div>
              <p className="eyebrow">{selected.exchange}</p>
              <h3>{selected.label}</h3>
            </div>
            <span className="data-badge">Provider-backed contracts</span>
          </div>
          <TradingViewAdvancedChart symbol={selected.tvSymbol}/>
          <div className="zx19-fno-note">
            <ShieldCheck />
            <p>
              The chart shows the underlying market view. Actual option strike,
              expiry, lot size and order instrument must come from Upstox after
              authorization; Zerion does not invent an F&O contract.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
