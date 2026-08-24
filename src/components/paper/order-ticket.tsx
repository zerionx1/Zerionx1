"use client";
import { useState } from "react";

const instruments=[
  {symbol:"BTC/USDT",market:"crypto"},
  {symbol:"ETH/USDT",market:"crypto"},
  {symbol:"NIFTY 50",market:"indian-index"},
  {symbol:"RELIANCE",market:"indian-equity"},
  {symbol:"EUR/USD",market:"forex"},
] as const;

export function OrderTicket(){
  const [message,setMessage]=useState("");const [selected,setSelected]=useState(0);const instrument=instruments[selected]!;
  async function submit(formData:FormData){
    setMessage("Validating quote and risk limits…");
    const payload={...Object.fromEntries(formData),symbol:instrument.symbol,market:instrument.market,quantity:Number(formData.get("quantity")),limitPrice:formData.get("limitPrice")?Number(formData.get("limitPrice")):undefined};
    const response=await fetch("/api/paper/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const json=await response.json();setMessage(response.ok?`Order ${json.data.order.status}. Reloading account…`:json.error?.message??"Order rejected");
    if(response.ok)setTimeout(()=>location.reload(),700);
  }
  return <form className="order-ticket" action={submit}>
    <div className="panel-header"><div><p className="eyebrow">Persistent simulation</p><h2>Paper order ticket</h2></div><span className="data-badge">No real money</span></div>
    <label>Instrument<select value={selected} onChange={event=>setSelected(Number(event.target.value))}>{instruments.map((item,index)=><option value={index} key={item.symbol}>{item.symbol} · {item.market}</option>)}</select></label>
    <div className="form-row"><label>Side<select name="side"><option value="buy">Buy</option><option value="sell">Sell</option></select></label><label>Type<select name="type"><option value="market">Market</option><option value="limit">Limit</option></select></label></div>
    <label>Quantity<input name="quantity" type="number" min="0.0001" step="any" defaultValue="1" required/></label>
    <label>Limit price (only for limit orders)<input name="limitPrice" type="number" min="0" step="any" placeholder="Optional"/></label>
    <button type="submit">Place paper order</button>{message&&<p className="form-message" aria-live="polite">{message}</p>}
    {instrument.market!=="crypto"&&<p className="mt-3 text-xs text-[#2F2A25]">Indian and forex instruments require ZERION_MARKET_DATA_BASE_URL. Crypto quotes use the public provider feed.</p>}
  </form>;
}
