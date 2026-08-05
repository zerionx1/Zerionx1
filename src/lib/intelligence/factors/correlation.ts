import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildCorrelationFactor(value:number,weight=1):SignalFactor{return {id:"correlation",label:"Correlation",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized correlation evidence",source:"technical"};}
