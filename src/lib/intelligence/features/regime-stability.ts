import { clamp, mean, stdDev } from "@/lib/intelligence/math";
export interface RegimeStabilityInput { values:number[]; benchmark?:number[]; }
export function computeRegimeStability(input:RegimeStabilityInput){
 const recent=input.values.slice(-50); const avg=mean(recent); const deviation=stdDev(recent);
 const raw=deviation===0?0.5:0.5+(recent.at(-1)!-avg)/(6*deviation);
 return {id:"regime-stability",score:clamp(raw),quality:recent.length>=20?"usable":"insufficient",sampleSize:recent.length} as const;
}
