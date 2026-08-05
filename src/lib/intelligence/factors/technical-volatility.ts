import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildTechnicalVolatilityFactor(value:number,weight=1):SignalFactor{return {id:"technical-volatility",label:"Technical Volatility",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized technical volatility evidence",source:"technical"};}
