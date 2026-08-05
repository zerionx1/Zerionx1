import { describe,expect,it } from "vitest";import { percentageChange,simpleMovingAverage } from "@/lib/market/indicators";
describe("market indicators",()=>{it("calculates percentage",()=>expect(percentageChange(110,100)).toBe(10));it("calculates SMA",()=>expect(simpleMovingAverage([1,2,3],2)[2]).toBe(2.5))});
