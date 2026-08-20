"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketKind, Timeframe } from "@/types/market";
import type { StrategyDefinition, StrategyNode } from "@/types/strategy";

type ReadyStrategy = {
  key: string; name: string; description: string; market: MarketKind; symbol: string;
  timeframe: Timeframe; style: string; minCapital: number; risk: "Low"|"Moderate"|"High"; nodes: StrategyNode[];
};

const readyStrategies: ReadyStrategy[] = [
  {key:"nifty-orb",name:"NIFTY Opening Range Breakout",description:"Opening range breakout with volume confirmation, ATR stop and daily loss guard.",market:"indian-index",symbol:"NSE:NIFTY50",timeframe:"5m",style:"Intraday momentum",minCapital:100000,risk:"Moderate",nodes:[
    {id:"source",kind:"source",label:"NIFTY 5m candles",x:40,y:80,config:{source:"candles"}},
    {id:"range",kind:"indicator",label:"Opening range 15m",x:250,y:50,config:{minutes:15}},
    {id:"volume",kind:"condition",label:"Volume confirmation",x:250,y:170,config:{multiple:1.4}},
    {id:"entry",kind:"entry",label:"Range breakout",x:480,y:95,config:{operator:"crosses-above"}},
    {id:"risk",kind:"risk",label:"ATR protective stop",x:480,y:210,config:{atrMultiple:1.8}},
    {id:"exit",kind:"exit",label:"2.2R target",x:700,y:140,config:{riskMultiple:2.2}},
  ]},
  {key:"banknifty-trend",name:"BANKNIFTY Trend Rider",description:"EMA alignment plus trend-strength confirmation and trailing risk management.",market:"indian-index",symbol:"NSE:BANKNIFTY",timeframe:"15m",style:"Trend following",minCapital:150000,risk:"High",nodes:[
    {id:"source",kind:"source",label:"BANKNIFTY candles",x:40,y:80,config:{source:"candles"}},
    {id:"ema",kind:"indicator",label:"EMA 20 / 50",x:250,y:50,config:{fast:20,slow:50}},
    {id:"entry",kind:"entry",label:"Trend continuation",x:480,y:100,config:{operator:"gt"}},
    {id:"risk",kind:"risk",label:"ATR stop",x:480,y:210,config:{atrMultiple:2}},
    {id:"exit",kind:"exit",label:"Trailing exit",x:700,y:145,config:{trailing:true}},
  ]},
  {key:"btc-breakout",name:"BTC Volatility Breakout",description:"24×7 CoinDCX breakout model using Donchian range, relative volume and strict risk caps.",market:"crypto",symbol:"BTC/USDT",timeframe:"15m",style:"Crypto breakout",minCapital:25000,risk:"Moderate",nodes:[
    {id:"source",kind:"source",label:"BTC/USDT candles",x:40,y:80,config:{source:"candles"}},
    {id:"donchian",kind:"indicator",label:"Donchian 20",x:250,y:50,config:{period:20}},
    {id:"rvol",kind:"condition",label:"Relative volume > 1.3",x:250,y:170,config:{multiple:1.3}},
    {id:"entry",kind:"entry",label:"Channel breakout",x:480,y:100,config:{operator:"crosses-above"}},
    {id:"risk",kind:"risk",label:"ATR 2× stop",x:480,y:210,config:{atrMultiple:2}},
    {id:"exit",kind:"exit",label:"2.5R target",x:700,y:145,config:{riskMultiple:2.5}},
  ]},
];

export function StrategyMarketplace() {
  const router=useRouter();const[query,setQuery]=useState("");const[market,setMarket]=useState<"all"|MarketKind>("all");const[busy,setBusy]=useState<string>();const[error,setError]=useState("");
  const visible=useMemo(()=>readyStrategies.filter(item=>`${item.name} ${item.description} ${item.symbol}`.toLowerCase().includes(query.toLowerCase())&&(market==="all"||item.market===market)),[market,query]);
  async function install(item:ReadyStrategy){
    setBusy(item.key);setError("");const now=new Date().toISOString();
    const strategy:StrategyDefinition={id:crypto.randomUUID(),ownerId:"current",name:item.name,description:item.description,markets:[item.market],symbols:[item.symbol],timeframe:item.timeframe,status:"paper-ready",nodes:item.nodes,edges:item.nodes.slice(1).map((node,index)=>({id:`edge-${index}`,source:item.nodes[index]!.id,target:node.id})),risk:{riskPerTradePct:item.risk==="High"?1.25:item.risk==="Low"?.5:1,maxDailyLossPct:3,maxOpenPositions:3,minRiskReward:2,stopLossMode:"atr",takeProfitMode:"risk-multiple"},tags:["ready-strategy",item.style.toLowerCase().replaceAll(" ","-")],version:1,createdAt:now,updatedAt:now};
    try{
      const response=await fetch("/api/strategies",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(strategy)});const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message??"Strategy install failed");
      const installed=payload.data.strategy;
      const deployment=await fetch("/api/algo/deployments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:installed.name,strategyId:installed.id,mode:"paper",market:installed.markets[0],symbol:installed.symbols[0],capital:Math.max(item.minCapital,1),autoStart:true,riskConfig:installed.risk})});const deploymentBody=await deployment.json();if(!deployment.ok)throw new Error(deploymentBody.error?.message??"Strategy saved but runtime could not start");
      router.push(`/dashboard/strategies?installed=${encodeURIComponent(installed.id)}`);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Install failed")}finally{setBusy(undefined)}
  }
  return <div className="space-y-6"><section className="panel"><p className="eyebrow">READY STRATEGIES</p><h2 className="mt-2 text-3xl font-semibold">Install ready-to-use strategies</h2><p className="mt-3 text-white/55">Ready strategies are preconfigured. Install them, then Enable / Disable / Delete from runtime. No Customize action is shown in this flow.</p></section>
  <div className="grid gap-3 md:grid-cols-[1fr_auto]"><input className="luxury-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ready strategy"/><div className="flex gap-2">{(["all","indian-index","crypto"] as const).map(x=><button key={x} className={`luxury-filter ${market===x?"luxury-filter--active":""}`} onClick={()=>setMarket(x)}>{x.replaceAll("-"," ")}</button>)}</div></div>
  {error?<div className="zx-error-banner">{error}</div>:null}<div className="grid gap-5 lg:grid-cols-2">{visible.map(item=><article className="panel" key={item.key}><div className="flex justify-between gap-4"><div><p className="eyebrow">{item.style}</p><h3 className="mt-2 text-2xl font-semibold">{item.name}</h3></div><Badge>{item.risk} risk</Badge></div><p className="mt-4 text-sm text-white/60">{item.description}</p><div className="mt-5 grid grid-cols-3 gap-2 text-sm"><div className="luxury-stat"><span>Market</span><strong>{item.market}</strong></div><div className="luxury-stat"><span>Timeframe</span><strong>{item.timeframe}</strong></div><div className="luxury-stat"><span>Capital</span><strong>₹{item.minCapital.toLocaleString("en-IN")}</strong></div></div><Button className="mt-6 w-full" disabled={Boolean(busy)} onClick={()=>void install(item)}>{busy===item.key?"Installing & enabling…":"Install strategy"}</Button></article>)}</div></div>;
}
