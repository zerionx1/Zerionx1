import type { ConfidenceBand, SignalFactor } from "@/types/intelligence";
import { clamp } from "@/lib/intelligence/math";
export function aggregateConfidence(factors:SignalFactor[], dataQuality:number){const total=factors.reduce((s,f)=>s+f.weight,0)||1;const weighted=factors.reduce((s,f)=>s+f.score*f.weight,0)/total;const probability=clamp(0.5+(weighted-0.5)*clamp(dataQuality));return {probability,band:toBand(probability),agreement:factors.filter(f=>f.score>=0.6).length/Math.max(1,factors.length)};}
export function toBand(v:number):ConfidenceBand{return v<.45?"very-low":v<.55?"low":v<.65?"moderate":v<.78?"high":"very-high";}
