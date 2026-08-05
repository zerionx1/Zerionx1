import { describe,it,expect } from "vitest";import { calculateWma } from "@/lib/intelligence/indicators/wma";
const series={timestamps:Array.from({length:30},(_,i)=>i),open:Array.from({length:30},(_,i)=>100+i),high:Array.from({length:30},(_,i)=>101+i),low:Array.from({length:30},(_,i)=>99+i),close:Array.from({length:30},(_,i)=>100+i),volume:Array.from({length:30},()=>1000)};
describe("wma",()=>{it("returns aligned output",()=>expect(calculateWma(series).values).toHaveLength(series.close.length));});
