"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";

type Position={id:string;symbol:string;market:string;quantity:number;averagePrice:number;markPrice:number;unrealizedPnl:number;realizedPnl:number};

export function PaperPositionsWorkspace(){
  const[rows,setRows]=useState<Position[]>([]);
  const[busy,setBusy]=useState<string|null>(null);
  const[message,setMessage]=useState("");

  const load=useCallback(async()=>{const r=await fetch("/api/paper/positions",{cache:"no-store"});const j=await r.json();setRows(j.data??[])},[]);
  useEffect(()=>{void load()},[load]);

  const open=useMemo(()=>rows.filter(r=>r.quantity!==0),[rows]);
  const closed=useMemo(()=>rows.filter(r=>r.quantity===0),[rows]);

  async function closePosition(p:Position){
    if(!window.confirm(`Square off ${p.symbol}?`)) return;
    setBusy(p.id);setMessage("");
    try{
      const r=await fetch("/api/paper/positions/close",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({positionId:p.id})});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error?.message??"Square off failed");
      setMessage(`${p.symbol} squared off.`);
      await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Square off failed")}finally{setBusy(null)}
  }

  return <div className="space-y-6">
    {message?<div className="panel text-sm">{message}</div>:null}
    <section className="panel">
      <div className="panel-header"><div><p className="eyebrow">OPEN POSITIONS</p><h2 className="mt-1 text-xl font-semibold">Running P&amp;L</h2></div><button className="zx-secondary-action" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</button></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="text-white/45"><th>Symbol</th><th>Qty</th><th>Average</th><th>Mark</th><th>Unrealized P&amp;L</th><th>Realized P&amp;L</th><th>Action</th></tr></thead><tbody>
        {open.map(p=><tr key={p.id} className="border-t border-white/10"><td className="py-3"><strong>{p.symbol}</strong><small className="block text-white/40">{p.market}</small></td><td>{p.quantity}</td><td>{p.averagePrice.toLocaleString()}</td><td>{p.markPrice.toLocaleString()}</td><td className={p.unrealizedPnl>=0?"positive":"negative"}>{p.unrealizedPnl.toLocaleString()}</td><td className={p.realizedPnl>=0?"positive":"negative"}>{p.realizedPnl.toLocaleString()}</td><td><button className="zx-exit-action" disabled={busy===p.id} onClick={()=>void closePosition(p)}><LogOut className="mr-2 h-4 w-4"/>{busy===p.id?"Exiting…":"Square off"}</button></td></tr>)}
      </tbody></table>{!open.length?<p className="py-6 text-white/50">No open paper positions.</p>:null}</div>
    </section>
    <section className="panel"><p className="eyebrow">CLOSED POSITIONS</p><h2 className="mt-1 text-xl font-semibold">Realized history</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="text-white/45"><th>Symbol</th><th>Exit mark</th><th>Realized P&amp;L</th></tr></thead><tbody>{closed.map(p=><tr key={p.id} className="border-t border-white/10"><td className="py-3">{p.symbol}</td><td>{p.markPrice.toLocaleString()}</td><td className={p.realizedPnl>=0?"positive":"negative"}>{p.realizedPnl.toLocaleString()}</td></tr>)}</tbody></table></div></section>
  </div>;
}
