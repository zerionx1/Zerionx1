import type { IndicatorResult, OhlcvSeries } from "@/types/intelligence";
import { mean, safeDiv } from "@/lib/intelligence/math";
export interface VolumeProfileOptions { period?: number; }
/** Volume profile approximation. Deterministic educational analytics; not investment advice. */
export function calculateVolumeProfile(series: OhlcvSeries, options: VolumeProfileOptions = {}): IndicatorResult {
 const period=Math.max(2,Math.floor(options.period ?? 14));
 const values=series.close.map((value,index)=>{
  if(index+1<period)return null;
  const window=series.close.slice(index+1-period,index+1);
  const baseline=mean(window);
  return Number.isFinite(value) ? safeDiv(value-baseline, Math.abs(baseline)||1) : null;
 });
 return {name:"volume-profile",values,metadata:{period,description:"Volume profile approximation"}};
}
