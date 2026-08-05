import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildDataFreshnessFactor(value:number,weight=1):SignalFactor{return {id:"data-freshness",label:"Data Freshness",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized data freshness evidence",source:"technical"};}
