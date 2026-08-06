"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Account = { currency:string; equity:number; cashBalance:number; buyingPower:number; dailyPnl:number; totalPnl:number };
type Position = { id:string; symbol:string; market:string; quantity:number; averagePrice:number; markPrice:number; unrealizedPnl:number; realizedPnl:number };
type Order = { id:string; symbol:string; market:string; side:string; type:string; quantity:number; status:string; averageFillPrice?:number; createdAt:string };

const instruments = [
  ["BTC/USDT","crypto"], ["ETH/USDT","crypto"], ["NIFTY 50","indian-index"],
  ["BANKNIFTY","indian-index"], ["RELIANCE","indian-equity"], ["EUR/USD","forex"], ["XAU/USD","forex"],
] as const;

export function PaperTradingWorkspace(){
  const [account,setAccount]=useState<Account|null>(null); const [positions,setPositions]=useState<Position[]>([]); const [orders,setOrders]=useState<Order[]>([]);
  const [instrument,setInstrument]=useState(0); const [side,setSide]=useState("buy"); const [type,setType]=useState("market");
  const [quantity,setQuantity]=useState("1"); const [limitPrice,setLimitPrice]=useState(""); const [stopPrice,setStopPrice]=useState("");
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  const selected=instruments[instrument]!;
  const load=useCallback(async()=>{const [a,p,o]=await Promise.all([fetch("/api/paper/account"),fetch("/api/paper/positions"),fetch("/api/paper/orders")]);
    const [aj,pj,oj]=await Promise.all([a.json(),p.json(),o.json()]); setAccount(aj.data??null); setPositions(pj.data??[]); setOrders(oj.data??[]);},[]);
  useEffect(()=>{void load();},[load]);
  const exposure=useMemo(()=>positions.reduce((sum,p)=>sum+Math.abs(p.quantity*p.markPrice),0),[positions]);
  async function place(){setBusy(true);setMessage("Validating quote, buying power and risk limits…");
    const payload={symbol:selected[0],market:selected[1],side,type,quantity:Number(quantity),limitPrice:limitPrice?Number(limitPrice):undefined,stopPrice:stopPrice?Number(stopPrice):undefined};
    const response=await fetch("/api/paper/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const json=await response.json();
    setMessage(response.ok?`Order ${json.data?.order?.status??"accepted"}. Account refreshed.`:json.error?.message??"Order rejected"); if(response.ok)await load();setBusy(false);
  }
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[["Equity",account&&`${account.currency} ${account.equity.toLocaleString()}`],["Cash",account&&`${account.currency} ${account.cashBalance.toLocaleString()}`],["Buying power",account&&`${account.currency} ${account.buyingPower.toLocaleString()}`],["Total P&L",account&&`${account.currency} ${account.totalPnl.toLocaleString()}`],["Gross exposure",account&&`${account.currency} ${exposure.toLocaleString()}`]].map(([label,value])=><div className="panel" key={label}><span className="text-sm text-white/45">{label}</span><strong className="mt-2 block text-xl">{value??"Loading…"}</strong></div>)}
    </div>
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.4fr]">
      <section className="panel space-y-4"><div className="panel-header"><div><p className="eyebrow">Provider-priced simulation</p><h2>Order ticket</h2></div><span className="data-badge">persistent</span></div>
        <label>Instrument<select value={instrument} onChange={e=>setInstrument(Number(e.target.value))}>{instruments.map((i,index)=><option key={i[0]} value={index}>{i[0]} · {i[1]}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label>Side<select value={side} onChange={e=>setSide(e.target.value)}><option value="buy">Buy</option><option value="sell">Sell</option></select></label><label>Order type<select value={type} onChange={e=>setType(e.target.value)}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option><option value="stop-limit">Stop limit</option></select></label></div>
        <label>Quantity<input value={quantity} onChange={e=>setQuantity(e.target.value)} type="number" min="0.0001" step="any"/></label>
        {(type==="limit"||type==="stop-limit")&&<label>Limit price<input value={limitPrice} onChange={e=>setLimitPrice(e.target.value)} type="number" min="0" step="any"/></label>}
        {(type==="stop"||type==="stop-limit")&&<label>Stop price<input value={stopPrice} onChange={e=>setStopPrice(e.target.value)} type="number" min="0" step="any"/></label>}
        <button disabled={busy||!Number(quantity)} onClick={place}>{busy?"Placing…":"Place paper order"}</button>{message&&<p className="text-sm text-white/60">{message}</p>}
        {selected[1]!=="crypto"&&<p className="text-xs text-white/45">This market requires your configured licensed data gateway. No synthetic quote is used.</p>}
      </section>
      <section className="panel"><div className="panel-header"><h2>Open positions</h2><span className="data-badge">{positions.length}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-white/45"><th>Symbol</th><th>Qty</th><th>Average</th><th>Mark</th><th>Unrealized</th></tr></thead><tbody>{positions.map(p=><tr className="border-t border-white/10" key={p.id}><td className="py-3">{p.symbol}<small className="block text-white/40">{p.market}</small></td><td>{p.quantity}</td><td>{p.averagePrice}</td><td>{p.markPrice}</td><td>{p.unrealizedPnl.toLocaleString()}</td></tr>)}</tbody></table>{positions.length===0&&<p className="py-6 text-white/50">No open positions.</p>}</div></section>
    </div>
    <section className="panel"><div className="panel-header"><h2>Order history</h2><span className="data-badge">{orders.length}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-white/45"><th>Instrument</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th><th>Time</th></tr></thead><tbody>{orders.slice(0,30).map(o=><tr className="border-t border-white/10" key={o.id}><td className="py-3">{o.symbol}</td><td>{o.side}</td><td>{o.type}</td><td>{o.quantity}</td><td>{o.status}</td><td>{new Date(o.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></section>
  </div>;
}
