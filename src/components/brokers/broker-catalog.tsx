"use client";
import { useEffect,useState } from "react";
import { brokerCatalog } from "@/config/brokers";
import { Card } from "@/components/ui/card";
export function BrokerCatalog(){
 const [message,setMessage]=useState("");const [connections,setConnections]=useState<Record<string,unknown>[]>([]);
 async function load(){const response=await fetch("/api/brokers");const json=await response.json();setConnections(json.data?.connections??[]);}
 useEffect(()=>{void load();},[]);
 async function connect(key:string){setMessage(`Preparing secure ${key} authorization…`);const response=await fetch("/api/brokers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brokerKey:key})});const json=await response.json();if(response.ok&&json.data.authorizationUrl)location.href=json.data.authorizationUrl;else setMessage(json.error?.message??`${key} credentials are not configured in Vercel`);}
 return <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{brokerCatalog.map(broker=>{const connection=connections.find(item=>item.broker_key===broker.key);const status=String(connection?.status??"disconnected");return <Card key={broker.key}><div className="flex justify-between gap-3"><div><p className="eyebrow">{broker.kind} · {broker.authMode}</p><h3 className="mt-2 text-xl font-semibold">{broker.name}</h3></div><span className="data-badge">{status}</span></div><p className="mt-4 text-sm text-white/55">Orders · positions · funds · {broker.capabilities.websocket?"streaming":"REST"}</p><button className="mt-5" onClick={()=>connect(broker.key)}>{status==="connected"?"Reconnect":"Connect securely"}</button></Card>;})}</div>{message&&<p className="mt-4 text-sm text-white/60">{message}</p>}</>;
}
