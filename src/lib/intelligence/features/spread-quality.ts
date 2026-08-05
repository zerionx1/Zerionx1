import { clamp, mean, stdDev } from "@/lib/intelligence/math";
export interface SpreadQualityInput { values:number[]; benchmark?:number[]; }
export function computeSpreadQuality(input:SpreadQualityInput){
 const recent=input.values.slice(-50); const avg=mean(recent); const deviation=stdDev(recent);
 const raw=deviation===0?0.5:0.5+(recent.at(-1)!-avg)/(6*deviation);
 return {id:"spread-quality",score:clamp(raw),quality:recent.length>=20?"usable":"insufficient",sampleSize:recent.length} as const;
}
