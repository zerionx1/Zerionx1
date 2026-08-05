import type { SignalFactor, TradingSignal } from "@/types/signal";
export function weightedConfidence(factors:SignalFactor[]){ if(!factors.length)return 0; return Math.round(factors.reduce((s,f)=>s+f.score,0)/factors.length); }
export function qualityFromConfidence(value:number):TradingSignal["quality"]{ return value>=80?"high":value>=60?"medium":"low"; }
export function validateSignal(signal:TradingSignal){ const errors:string[]=[]; if(signal.confidence<0||signal.confidence>100)errors.push("confidence_out_of_range"); if(signal.entryZone[0]>signal.entryZone[1])errors.push("invalid_entry_zone"); if(signal.riskReward<=0)errors.push("invalid_risk_reward"); return errors; }
