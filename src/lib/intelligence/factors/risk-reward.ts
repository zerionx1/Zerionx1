import type { SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function buildRiskRewardFactor(value:number,weight=1):SignalFactor{return {id:"risk-reward",label:"Risk Reward",score:clamp(value),weight:Math.max(0,weight),explanation:"Normalized risk reward evidence",source:"risk"};}
