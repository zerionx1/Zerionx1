import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildVolumeFactor(value:number,weight=1):SignalFactor{return {id:"volume",label:"Volume",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized volume evidence",source:"technical"};}
