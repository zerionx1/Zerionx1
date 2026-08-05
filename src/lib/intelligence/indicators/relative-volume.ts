import type { IndicatorResult, OhlcvSeries } from "@/types/intelligence";
import { mean, safeDiv } from "@/lib/intelligence/math";
export interface RelativeVolumeOptions { period?: number; }
/** Relative volume. Deterministic educational analytics; not investment advice. */
export function calculateRelativeVolume(series: OhlcvSeries, options: RelativeVolumeOptions = {}): IndicatorResult {
 const period=Math.max(2,Math.floor(options.period ?? 14));
 const values=series.close.map((value,index)=>{
  if(index+1<period)return null;
  const window=series.close.slice(index+1-period,index+1);
  const baseline=mean(window);
  return Number.isFinite(value) ? safeDiv(value-baseline, Math.abs(baseline)||1) : null;
 });
 return {name:"relative-volume",values,metadata:{period,description:"Relative volume"}};
}
