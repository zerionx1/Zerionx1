"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StrategyCanvas } from "@/components/strategies/strategy-canvas";
import type { StrategyDefinition,StrategyNodeKind } from "@/types/strategy";

export function StrategyEditor({initial,palette,validation}:{initial:StrategyDefinition;palette:ReactNode;validation:ReactNode}){
 const router=useRouter();const [strategy,setStrategy]=useState(initial);const [message,setMessage]=useState("");
 async function save(){setMessage("Saving…");const response=await fetch(`/api/strategies/${strategy.id}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...strategy,updatedAt:new Date().toISOString()})});const json=await response.json();setMessage(response.ok?"Saved and persisted":json.error?.message??"Save failed");if(response.ok)router.refresh();}
 async function validate(){setMessage("Validating graph…");const response=await fetch(`/api/strategies/${strategy.id}/validate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(strategy)});const json=await response.json();setMessage(response.ok?(json.data.valid?"Strategy is valid":`${json.data.issues.length} validation issues`):json.error?.message??"Validation failed");}
 async function version(){const response=await fetch(`/api/strategies/${strategy.id}/versions`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({note:"Manual snapshot"})});setMessage(response.ok?"Version created":"Version failed");}
 function add(kind:StrategyNodeKind){const node={id:crypto.randomUUID(),kind,label:`New ${kind}`,x:80+strategy.nodes.length*35,y:100+strategy.nodes.length*25,config:{}};setStrategy(current=>({...current,nodes:[...current.nodes,node],updatedAt:new Date().toISOString()}));}
 return <>
  <section className="panel mb-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <label>Name<input value={strategy.name} onChange={e=>setStrategy(v=>({...v,name:e.target.value}))}/></label>
   <label>Symbol<input value={strategy.symbols.join(", ")} onChange={e=>setStrategy(v=>({...v,symbols:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)}))}/></label>
   <label>Timeframe<select value={strategy.timeframe} onChange={e=>setStrategy(v=>({...v,timeframe:e.target.value as StrategyDefinition["timeframe"]}))}>{["1m","5m","15m","30m","1h","4h","1d"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Risk per trade %<input type="number" min="0.1" max="5" step="0.1" value={strategy.risk.riskPerTradePct} onChange={e=>setStrategy(v=>({...v,risk:{...v.risk,riskPerTradePct:Number(e.target.value)}}))}/></label>
  </div><label className="mt-4 block">Description<textarea rows={3} value={strategy.description} onChange={e=>setStrategy(v=>({...v,description:e.target.value}))}/></label></section>
  <div className="mb-4 flex flex-wrap gap-3"><Button onClick={save}>Save draft</Button><Button variant="secondary" onClick={validate}>Validate</Button><Button variant="secondary" onClick={version}>Create version</Button>{(["source","indicator","condition","risk","entry","exit","logic"] as StrategyNodeKind[]).map(kind=><Button key={kind} variant="ghost" onClick={()=>add(kind)}>+ {kind}</Button>)}{message&&<span className="self-center text-sm text-white/60">{message}</span>}</div>
  <div className="grid gap-5 xl:grid-cols-[240px_1fr_300px]"><div>{palette}</div><StrategyCanvas strategy={strategy}/><div>{validation}</div></div>
 </>;
}
