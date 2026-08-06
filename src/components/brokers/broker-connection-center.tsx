"use client";
import { useCallback,useEffect,useState } from "react";
const providers=[
 {key:"zerodha",name:"Zerodha Kite",region:"India",markets:"NSE · BSE · NFO · CDS",mode:"OAuth"},
 {key:"upstox",name:"Upstox",region:"India",markets:"NSE · BSE · F&O · MCX",mode:"OAuth"},
 {key:"angel-one",name:"Angel One SmartAPI",region:"India",markets:"NSE · BSE · NFO · MCX",mode:"OAuth/API"},
 {key:"fyers",name:"FYERS",region:"India",markets:"NSE · BSE · F&O",mode:"OAuth"},
 {key:"shoonya",name:"Shoonya",region:"India",markets:"NSE · BSE · NFO · MCX",mode:"API"},
 {key:"binance",name:"Binance",region:"Global",markets:"Crypto spot · futures",mode:"API key"},
 {key:"bybit",name:"Bybit",region:"Global",markets:"Crypto spot · derivatives",mode:"API key"},
 {key:"oanda",name:"OANDA",region:"Global",markets:"Forex · metals",mode:"OAuth/API"},
] as const;
export function BrokerConnectionCenter(){const [connections,setConnections]=useState<Record<string,unknown>[]>([]);const [message,setMessage]=useState("");const load=useCallback(async()=>{const r=await fetch("/api/brokers");const j=await r.json();setConnections(j.data?.connections??[])},[]);useEffect(()=>{void load()},[load]);
 async function connect(key:string){setMessage(`Preparing secure ${key} authorization…`);const r=await fetch("/api/brokers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brokerKey:key})});const j=await r.json();if(r.ok&&j.data?.authorizationUrl)location.href=j.data.authorizationUrl;else setMessage(j.error?.message??"Provider credentials are not configured.")}
 return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{providers.map(p=>{const row=connections.find(c=>c.broker_key===p.key);const status=String(row?.status??"disconnected");return <article className="panel" key={p.key}><div className="flex justify-between gap-3"><div><p className="eyebrow">{p.region} · {p.mode}</p><h2 className="mt-2 text-xl">{p.name}</h2></div><span className="data-badge">{status}</span></div><p className="mt-4 text-sm text-white/55">{p.markets}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-white/45"><span>Orders</span><span>Funds</span><span>Positions</span></div><button className="mt-5 w-full" onClick={()=>connect(p.key)}>{status==="connected"?"Reconnect securely":"Connect provider"}</button></article>})}</div>{message&&<p className="panel text-sm text-white/60">{message}</p>}<div className="panel"><h2>Execution safety</h2><p className="mt-2 text-sm text-white/55">Connecting a broker never enables autonomous live execution. Each live deployment remains disabled until user approval, risk limits and provider health checks pass.</p></div></div>}
