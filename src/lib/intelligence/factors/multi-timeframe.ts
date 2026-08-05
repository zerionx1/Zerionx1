import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildMultiTimeframeFactor(value:number,weight=1):SignalFactor{return {id:"multi-timeframe",label:"Multi Timeframe",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized multi timeframe evidence",source:"technical"};}
