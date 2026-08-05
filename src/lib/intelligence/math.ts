export function clamp(value:number,min=0,max=1){return Math.min(max,Math.max(min,value));}
export function mean(values:number[]){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
export function stdDev(values:number[]){if(values.length<2)return 0;const m=mean(values);return Math.sqrt(mean(values.map(v=>(v-m)**2)));}
export function rolling(values:number[], period:number, fn:(window:number[])=>number){return values.map((_,i)=>i+1<period?null:fn(values.slice(i+1-period,i+1)));}
export function safeDiv(a:number,b:number,fallback=0){return b===0||!Number.isFinite(a/b)?fallback:a/b;}
