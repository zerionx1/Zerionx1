import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildLiquidityFactor(value:number,weight=1):SignalFactor{return {id:"liquidity",label:"Liquidity",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized liquidity evidence",source:"technical"};}
