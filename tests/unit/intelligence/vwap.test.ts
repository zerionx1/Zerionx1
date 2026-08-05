import { describe,it,expect } from "vitest";import { calculateVwap } from "@/lib/intelligence/indicators/vwap";
const series={timestamps:Array.from({length:30},(_,i)=>i),open:Array.from({length:30},(_,i)=>100+i),high:Array.from({length:30},(_,i)=>101+i),low:Array.from({length:30},(_,i)=>99+i),close:Array.from({length:30},(_,i)=>100+i),volume:Array.from({length:30},()=>1000)};
describe("vwap",()=>{it("returns aligned output",()=>expect(calculateVwap(series).values).toHaveLength(series.close.length));});
