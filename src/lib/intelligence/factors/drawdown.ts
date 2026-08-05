import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildDrawdownFactor(value:number,weight=1):SignalFactor{return {id:"drawdown",label:"Drawdown",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized drawdown evidence",source:"risk"};}
