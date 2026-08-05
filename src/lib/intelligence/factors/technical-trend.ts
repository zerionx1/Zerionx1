import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildTechnicalTrendFactor(value:number,weight=1):SignalFactor{return {id:"technical-trend",label:"Technical Trend",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized technical trend evidence",source:"technical"};}
