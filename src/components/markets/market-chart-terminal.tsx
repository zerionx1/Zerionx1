"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import type { ChartPriceLine } from "@/components/charts/zerion-pro-chart";
import type { MarketInstrument, Timeframe } from "@/types/market";

const frames: Timeframe[] = ["1m","3m","5m","15m","30m","1h","4h","1d","1w"];

type PaperPosition = {
  id:string; symbol:string; market:string; quantity:number; averagePrice:number;
  stopLoss?:number; targetPrice?:number; unrealizedPnl:number;
};

function clean(v:string){return v.trim().toUpperCase().replaceAll("/","").replaceAll("-","")}

export function MarketChartTerminal() {
  const router=useRouter(), params=useSearchParams();
  const initialId=params.get("instrument")??"";
  const initialSymbol=params.get("symbol")??"NIFTY 50";
  const rawTf=params.get("tf") as Timeframe|null;
  const [query,setQuery]=useState(initialSymbol),[selected,setSelected]=useState<MarketInstrument|null>(null),[results,setResults]=useState<MarketInstrument[]>([]),[searching,setSearching]=useState(false);
  const [timeframe,setTimeframe]=useState<Timeframe>(frames.includes(rawTf as Timeframe)?rawTf as Timeframe:"15m");
  const [paper,setPaper]=useState<PaperPosition[]>([]);
  const [liveRows,setLiveRows]=useState<Record<string,unknown>[]>([]);

  useEffect(()=>{if(!initialId)return;void fetch(`/api/markets/search?q=${encodeURIComponent(initialSymbol)}`,{cache:"no-store"}).then(r=>r.json()).then(b=>{const rows=(b.data??[]) as MarketInstrument[];const hit=rows.find(x=>x.id===initialId);if(hit)setSelected(hit)}).catch(()=>{})},[initialId,initialSymbol]);

  useEffect(()=>{const v=query.trim();if(v.length<2){setResults([]);return}const c=new AbortController(),t=setTimeout(async()=>{setSearching(true);try{const r=await fetch(`/api/markets/search?q=${encodeURIComponent(v)}`,{cache:"no-store",signal:c.signal});const b=await r.json();setResults((b.data??[]) as MarketInstrument[])}catch{if(!c.signal.aborted)setResults([])}finally{if(!c.signal.aborted)setSearching(false)}},180);return()=>{c.abort();clearTimeout(t)}},[query]);

  useEffect(()=>{void Promise.all([
    fetch("/api/paper/positions",{cache:"no-store"}).then(r=>r.json()).then(b=>setPaper(b.data??[])).catch(()=>setPaper([])),
    fetch("/api/live/account?broker=upstox",{cache:"no-store"}).then(r=>r.json()).then(b=>{const rows=b.data?.positions?.data;setLiveRows(Array.isArray(rows)?rows:[])}).catch(()=>setLiveRows([])),
  ])},[selected]);

  function choose(item:MarketInstrument){
    setSelected(item);setQuery(item.symbol);setResults([]);
    const q=new URLSearchParams({instrument:item.id,symbol:item.symbol,tf:timeframe});
    router.replace(`/dashboard/charts?${q.toString()}`,{scroll:false});
  }
  function changeTf(tf:Timeframe){setTimeframe(tf);const q=new URLSearchParams({instrument:selected?.id??initialId,symbol:selected?.symbol??query,tf});router.replace(`/dashboard/charts?${q.toString()}`,{scroll:false})}

  const priceLines=useMemo<ChartPriceLine[]>(()=>{
    const symbol=clean(selected?.symbol??query),lines:ChartPriceLine[]=[];
    paper.filter(p=>clean(p.symbol)===symbol&&p.quantity!==0).forEach(p=>{
      lines.push({id:`paper-entry-${p.id}`,price:p.averagePrice,label:"Paper entry",kind:"entry",pnl:p.unrealizedPnl});
      if(p.stopLoss)lines.push({id:`paper-sl-${p.id}`,price:p.stopLoss,label:"SL",kind:"stop"});
      if(p.targetPrice)lines.push({id:`paper-tp-${p.id}`,price:p.targetPrice,label:"Target",kind:"target"});
    });
    liveRows.forEach((r,i)=>{
      const s=clean(String(r.trading_symbol??r.tradingsymbol??r.symbol??""));if(!s||s!==symbol)return;
      const entry=Number(r.average_price??r.averagePrice??r.buy_price??0),pnl=Number(r.pnl??0);
      if(entry>0)lines.push({id:`live-entry-${i}`,price:entry,label:"Live entry",kind:"entry",pnl});
      const sl=Number(r.stop_loss??r.stopLoss??0),target=Number(r.target??r.target_price??0);
      if(sl>0)lines.push({id:`live-sl-${i}`,price:sl,label:"Live SL",kind:"stop"});
      if(target>0)lines.push({id:`live-tp-${i}`,price:target,label:"Live target",kind:"target"});
    });
    return lines;
  },[liveRows,paper,query,selected]);

  return <div className="zx-chart-workspace space-y-4">
    <section className="zx-chart-commandbar">
      <div className="relative zx-chart-search"><Search className="h-4 w-4"/><input value={query} onChange={e=>{setQuery(e.target.value);setSelected(null)}} placeholder="Search Upstox stock/index/F&O or CoinDCX pair"/>{searching?<span className="text-xs text-white/40">Searching…</span>:null}
      {results.length&&!selected?<div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#151a1d] p-2 shadow-2xl">{results.slice(0,40).map(item=><button key={item.id} type="button" className="flex w-full justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5" onClick={()=>choose(item)}><span><strong className="block">{item.symbol}</strong><small className="text-white/45">{item.displayName}</small></span><span className="text-right text-[10px] uppercase text-white/35">{item.exchange}<br/>{item.market.replaceAll("-"," ")}</span></button>)}</div>:null}</div>
      <div className="zx-chart-timeframes">{frames.map(tf=><button key={tf} onClick={()=>changeTf(tf)} className={timeframe===tf?"is-active":""}>{tf}</button>)}</div>
    </section>
    <section className="zx-chart-stage"><header><div><p className="eyebrow">ZERION X1 · PROVIDER TERMINAL</p><h2>{selected?.displayName??query}</h2><p className="mt-1 text-xs text-white/45">{selected?`${selected.exchange} · ${selected.market.replaceAll("-"," ")} · ${selected.id.startsWith("coindcx:")?"CoinDCX":"Upstox"}`:"Select a provider-backed instrument"}</p></div><span className="data-badge">Own chart · provider-backed</span></header>
      <ZerionProviderChart instrument={selected} symbol={selected?.symbol??query} timeframe={timeframe} height={720} priceLines={priceLines}/>
    </section>
  </div>;
}
