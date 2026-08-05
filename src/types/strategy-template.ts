import type { MarketKind, Timeframe } from "@/types/market";
export interface StrategyTemplate { id:string; name:string; summary:string; difficulty:"beginner"|"intermediate"|"advanced"; markets:MarketKind[]; timeframe:Timeframe; tags:string[]; educationalOnly:boolean; }
