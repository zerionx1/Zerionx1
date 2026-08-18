"use client";

import { useMemo, useState } from "react";
import { Landmark, LogOut, RefreshCw, WalletCards } from "lucide-react";
type Broker="upstox"|"ctrader"; type Row=Record<string,unknown>;
const n=(v:unknown)=>Number(v??0);
function nestedRows(v:unknown){if(!v||typeof v!=="object")return [] as Row[];const d=(v as {data?:unknown}).data;return Array.isArray(d)?d as Row[]:[]}

export function LivePositionsWorkspace(){
  const[broker,setBroker]=useState<Broker>("upstox"),[data,setData]=useState<Record<string,unknown>|null>(null),[accountId,setAccountId]=useState(""),[environment,setEnvironment]=useState<"live"|"demo">("live"),[busy,setBusy]=useState(false),[exitBusy,setExitBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState("");

  async function sync(nextAccountId=accountId){
    setBusy(true);setError("");setMessage("");
    try{
      const q=new URLSearchParams({broker});
      if(broker==="ctrader"&&nextAccountId){q.set("accountId",nextAccountId);q.set("environment",environment)}
      const r=await fetch(`/api/live/account?${q}`,{cache:"no-store"});const j=await r.json();
      if(!r.ok)throw new Error(j.error?.message??"Sync failed");setData(j.data??{});
    }catch(e){setError(e instanceof Error?e.message:"Sync failed")}finally{setBusy(false)}
  }

  const up=useMemo(()=>broker==="upstox"&&data?nestedRows(data.positions):[],[broker,data]);
  const accounts=useMemo(()=>broker==="ctrader"&&data&&Array.isArray(data.accounts)?data.accounts as Row[]:[],[broker,data]);
  const cp=useMemo(()=>broker==="ctrader"&&data&&Array.isArray(data.positions)?data.positions as Row[]:[],[broker,data]);
  const pnl=useMemo(()=>broker==="upstox"?up.reduce((s,r)=>s+n(r.pnl),0):cp.reduce((s,r)=>s+n(r.grossUnrealizedPnL??r.grossUnrealizedPnl??r.unrealizedPnL),0),[broker,up,cp]);

  async function exitUpstox(){
    if(!window.confirm("Square off ALL open Upstox positions now?"))return;
    setExitBusy("all");
    try{const r=await fetch("/api/live/positions/exit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({broker:"upstox"})});const j=await r.json();if(!r.ok)throw new Error(j.error?.message??"Exit failed");setMessage("Upstox square-off request accepted.");await sync()}catch(e){setError(e instanceof Error?e.message:"Exit failed")}finally{setExitBusy("")}
  }

  async function exitCTrader(p:Row){
    const positionId=String(p.positionId??p.position_id??"");
    const td=p.tradeData&&typeof p.tradeData==="object"?p.tradeData as Row:{};
    const pv=n(td.volume??p.volume);const volume=pv>100?pv/100:pv;
    if(!positionId||!volume){setError("cTrader position ID or volume is missing.");return}
    if(!window.confirm(`Close cTrader position ${positionId}?`))return;
    setExitBusy(positionId);
    try{const r=await fetch("/api/live/positions/exit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({broker:"ctrader",accountId,environment,positionId,volume})});const j=await r.json();if(!r.ok)throw new Error(j.error?.message??"Exit failed");setMessage("cTrader close request accepted.");await sync()}catch(e){setError(e instanceof Error?e.message:"Exit failed")}finally{setExitBusy("")}
  }

  return <div className="space-y-6">
    <div className="zx-switch-grid">
      <button type="button" className={broker==="upstox"?"is-active":""} onClick={()=>{setBroker("upstox");setData(null);setAccountId("")}}><Landmark/><span>Indian Markets</span><small>Upstox</small></button>
      <button type="button" className={broker==="ctrader"?"is-active":""} onClick={()=>{setBroker("ctrader");setData(null);setAccountId("")}}><WalletCards/><span>Forex</span><small>cTrader</small></button>
    </div>
    <section className="zx-live-panel">
      <div className="zx-live-panel__head"><div><p className="eyebrow">{broker.toUpperCase()}</p><h2>Live positions</h2></div><button className="zx-secondary-action" disabled={busy} onClick={()=>void sync()}><RefreshCw className="mr-2 h-4 w-4"/>{busy?"Syncing…":"Sync now"}</button></div>
      {error?<div className="zx-error-banner">{error}</div>:null}{message?<div className="panel mt-4 text-sm">{message}</div>:null}
      {broker==="ctrader"&&accounts.length&&!accountId?<div className="mt-5 grid gap-3 md:grid-cols-2">{accounts.map(a=>{const id=String(a.ctidTraderAccountId??"");const live=Boolean(a.isLive);return <button key={id} className="zx-account-choice" onClick={()=>{setAccountId(id);setEnvironment(live?"live":"demo");setTimeout(()=>void sync(id),0)}}><strong>Account {id}</strong><span>{live?"Live":"Demo"}</span></button>})}</div>:null}
      {data?<><div className="zx-stat-grid mt-5"><article><span>Open positions</span><strong>{broker==="upstox"?up.filter(r=>n(r.quantity)!==0).length:cp.length}</strong></article><article><span>Current live P&amp;L</span><strong className={pnl>=0?"positive":"negative"}>{pnl.toLocaleString()}</strong></article></div>
      {broker==="upstox"?<div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Upstox positions</h3><button className="zx-exit-action" disabled={exitBusy==="all"} onClick={()=>void exitUpstox()}><LogOut className="mr-2 h-4 w-4"/>{exitBusy==="all"?"Exiting…":"Square off all open positions"}</button></div></div>:accountId?<div className="mt-5 space-y-3">{cp.map(p=>{const id=String(p.positionId??p.position_id??"");const pnl=n(p.grossUnrealizedPnL??p.grossUnrealizedPnl??p.unrealizedPnL);return <article key={id} className="zx-live-position-row"><div><span>Position</span><strong>{id}</strong></div><div><span>P&amp;L</span><strong className={pnl>=0?"positive":"negative"}>{pnl.toLocaleString()}</strong></div><button className="zx-exit-action" disabled={exitBusy===id} onClick={()=>void exitCTrader(p)}><LogOut className="mr-2 h-4 w-4"/>{exitBusy===id?"Exiting…":"Exit"}</button></article>})}</div>:null}</>:<p className="mt-5 text-sm text-white/50">Sync the linked account to load live positions and P&amp;L.</p>}
    </section>
  </div>;
}
