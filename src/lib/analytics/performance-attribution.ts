import { mean } from "@/lib/intelligence/math";
export function calculatePerformanceAttribution(values:number[]){const clean=values.filter(Number.isFinite);return {metric:"performance-attribution",count:clean.length,value:mean(clean),min:clean.length?Math.min(...clean):0,max:clean.length?Math.max(...clean):0};}
