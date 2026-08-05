import type { MarketKind, MarketSessionState } from "@/types/market";
export function getMarketSessionState(market:MarketKind, now=new Date()): MarketSessionState {
 if(market==="crypto") return "open";
 const day=now.getUTCDay(); if(day===0||day===6) return "closed";
 if(market.startsWith("india")){ const mins=now.getUTCHours()*60+now.getUTCMinutes(); return mins>=225&&mins<=600?"open":"closed"; }
 return "open";
}
