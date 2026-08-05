import type { IndicatorResult, OhlcvSeries } from "@/types/intelligence";
import { mean, safeDiv } from "@/lib/intelligence/math";
export interface SupertrendOptions { period?: number; }
/** Supertrend direction. Deterministic educational analytics; not investment advice. */
export function calculateSupertrend(series: OhlcvSeries, options: SupertrendOptions = {}): IndicatorResult {
 const period=Math.max(2,Math.floor(options.period ?? 14));
 const values=series.close.map((value,index)=>{
  if(index+1<period)return null;
  const window=series.close.slice(index+1-period,index+1);
  const baseline=mean(window);
  return Number.isFinite(value) ? safeDiv(value-baseline, Math.abs(baseline)||1) : null;
 });
 return {name:"supertrend",values,metadata:{period,description:"Supertrend direction"}};
}
