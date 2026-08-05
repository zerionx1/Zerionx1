import type { MarketRegime } from "@/types/intelligence";
import { mean, stdDev } from "@/lib/intelligence/math";
export function detectLiquidityRegime(values:number[]):{regime:MarketRegime;confidence:number;reason:string}{
 const recent=values.slice(-30); if(recent.length<10)return {regime:"unknown",confidence:0,reason:"Insufficient observations"};
 const first = recent[0] ?? 0;
 const last = recent.at(-1) ?? first;
 const denominator = Math.abs(first) || 1;
 const change = (last - first) / denominator;
 const vol = recent.length > 0
   ? stdDev(recent) / (Math.abs(mean(recent)) || 1)
   : 0;
 if(vol>0.05)return {regime:"volatile",confidence:Math.min(0.95,vol*8),reason:"Elevated normalized dispersion"};
 if(change>0.02)return {regime:"trending-up",confidence:Math.min(0.9,0.5+change*5),reason:"Positive directional change"};
 if(change<-0.02)return {regime:"trending-down",confidence:Math.min(0.9,0.5+Math.abs(change)*5),reason:"Negative directional change"};
 return {regime:"range",confidence:0.65,reason:"Limited directional displacement"};
}
