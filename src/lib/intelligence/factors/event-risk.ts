import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildEventRiskFactor(value:number,weight=1):SignalFactor{return {id:"event-risk",label:"Event Risk",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized event risk evidence",source:"risk"};}
