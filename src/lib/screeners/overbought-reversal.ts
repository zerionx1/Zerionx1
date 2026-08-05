import type { ScreenerRule } from "@/types/screener";
export const overboughtReversalRule:ScreenerRule={id:"overbought-reversal",label:"Overbought Reversal",evaluate(candidate){
 if(candidate.dataAgeMs>60_000)return null; const values=Object.values(candidate.metrics).filter(Number.isFinite); if(!values.length)return null;
 const score=Math.max(0,Math.min(1,values.reduce((a,b)=>a+b,0)/values.length));
 return score>=0.55?{...candidate,score,reasons:["Rule threshold satisfied","Data freshness accepted"],warnings:score<0.7?["Moderate-quality match"]:[]}:null;
}};
