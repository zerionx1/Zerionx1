import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildSpreadFactor(value:number,weight=1):SignalFactor{return {id:"spread",label:"Spread",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized spread evidence",source:"technical"};}
