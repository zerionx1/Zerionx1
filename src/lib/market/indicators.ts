export function simpleMovingAverage(values:number[], period:number): number[] {
 if(period<=0) throw new Error("Period must be positive");
 return values.map((_,i)=> i+1<period ? Number.NaN : values.slice(i-period+1,i+1).reduce((a,b)=>a+b,0)/period);
}
export function percentageChange(current:number, previous:number){ return previous===0?0:((current-previous)/previous)*100; }
export function averageTrueRange(candles:{high:number;low:number;close:number}[],period=14){
 const tr=candles.map((c,i)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-candles[i - 1]!.close),Math.abs(c.low-candles[i - 1]!.close)));
 return simpleMovingAverage(tr,period);
}
