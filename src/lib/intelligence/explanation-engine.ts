import type { SignalFactor } from "@/types/intelligence";
export function explainFactors(factors:SignalFactor[]){return [...factors].sort((a,b)=>b.score*b.weight-a.score*a.weight).map(f=>({factor:f.label,contribution:Number((f.score*f.weight).toFixed(4)),explanation:f.explanation}));}
