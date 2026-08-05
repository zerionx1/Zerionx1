import { describe,it,expect } from "vitest";import { calculateMacd } from "@/lib/intelligence/indicators/macd";
const series={timestamps:Array.from({length:30},(_,i)=>i),open:Array.from({length:30},(_,i)=>100+i),high:Array.from({length:30},(_,i)=>101+i),low:Array.from({length:30},(_,i)=>99+i),close:Array.from({length:30},(_,i)=>100+i),volume:Array.from({length:30},()=>1000)};
describe("macd",()=>{it("returns aligned output",()=>expect(calculateMacd(series).values).toHaveLength(series.close.length));});
