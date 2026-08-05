import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildModelStabilityFactor(value:number,weight=1):SignalFactor{return {id:"model-stability",label:"Model Stability",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized model stability evidence",source:"technical"};}
