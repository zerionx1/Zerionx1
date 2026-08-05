import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildSessionFactor(value:number,weight=1):SignalFactor{return {id:"session",label:"Session",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized session evidence",source:"technical"};}
