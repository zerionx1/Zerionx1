import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildMarketStructureFactor(value:number,weight=1):SignalFactor{return {id:"market-structure",label:"Market Structure",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized market structure evidence",source:"technical"};}
