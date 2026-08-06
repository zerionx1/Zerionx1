"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StrategyDefinition, StrategyNode } from "@/types/strategy";

const templates={
  momentum:{name:"Momentum Breakout",description:"Trend and volume confirmed breakout with ATR risk controls.",nodes:[
    {id:"source",kind:"source" as const,label:"Market candles",x:40,y:80,config:{source:"candles"}},
    {id:"ema",kind:"indicator" as const,label:"EMA 20 / 50",x:240,y:60,config:{fast:20,slow:50}},
    {id:"volume",kind:"condition" as const,label:"Volume > 1.5× average",x:240,y:180,config:{multiple:1.5}},
    {id:"entry",kind:"entry" as const,label:"Breakout entry",x:470,y:100,config:{operator:"crosses-above"}},
    {id:"risk",kind:"risk" as const,label:"ATR stop",x:470,y:220,config:{atrMultiple:2}},
    {id:"exit",kind:"exit" as const,label:"2R target",x:700,y:150,config:{riskMultiple:2}},
  ]},
  meanReversion:{name:"RSI Mean Reversion",description:"Oversold recovery strategy with structure stop and fixed risk.",nodes:[
    {id:"source",kind:"source" as const,label:"Market candles",x:40,y:100,config:{source:"candles"}},
    {id:"rsi",kind:"indicator" as const,label:"RSI 14",x:250,y:70,config:{period:14}},
    {id:"condition",kind:"condition" as const,label:"RSI crosses above 30",x:460,y:70,config:{level:30}},
    {id:"entry",kind:"entry" as const,label:"Recovery entry",x:660,y:70,config:{type:"market"}},
    {id:"risk",kind:"risk" as const,label:"Structure stop",x:460,y:210,config:{lookback:10}},
    {id:"exit",kind:"exit" as const,label:"RSI 55 exit",x:660,y:210,config:{level:55}},
  ]},
};

export function NewStrategyButton(){
  const router=useRouter();const [busy,setBusy]=useState(false);
  async function create(template:keyof typeof templates="momentum"){
    setBusy(true);const now=new Date().toISOString();const chosen=templates[template];
    const nodes=chosen.nodes.map(node=>({...node}));
    const sanitizedNodes: StrategyNode[] = nodes.map((node) => ({
      ...node,
      config: Object.fromEntries(
        Object.entries(node.config).filter(([, value]) => value !== undefined),
      ) as Record<string, string | number | boolean>,
    }));

    const strategy:StrategyDefinition={
      id:crypto.randomUUID(),ownerId:"current",name:chosen.name,description:chosen.description,
      markets:["crypto"],symbols:["BTC/USDT"],timeframe:"15m",status:"draft",nodes:sanitizedNodes,
      edges:sanitizedNodes.slice(1).map((node,index)=>({id:`edge-${index}`,source:sanitizedNodes[index]!.id,target:node.id})),
      risk:{riskPerTradePct:1,maxDailyLossPct:3,maxOpenPositions:3,minRiskReward:2,stopLossMode:"atr",takeProfitMode:"risk-multiple"},
      tags:["template","risk-managed"],version:1,createdAt:now,updatedAt:now,
    };
    const response=await fetch("/api/strategies",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(strategy)});
    const json=await response.json();setBusy(false);
    if(response.ok)router.push(`/dashboard/strategies/${json.data.strategy.id}`);else alert(json.error?.message??"Unable to create strategy");
  }
  return <div className="flex flex-wrap gap-2"><Button onClick={()=>create("momentum")} disabled={busy}>{busy?"Creating…":"Momentum template"}</Button><Button variant="secondary" onClick={()=>create("meanReversion")} disabled={busy}>RSI template</Button></div>;
}
