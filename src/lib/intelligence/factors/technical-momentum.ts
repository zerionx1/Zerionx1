import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildTechnicalMomentumFactor(value:number,weight=1):SignalFactor{return {id:"technical-momentum",label:"Technical Momentum",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized technical momentum evidence",source:"technical"};}
