import { describe,it,expect } from "vitest"; import { compileStrategy } from "@/lib/strategy/compiler"; import { listStrategies } from "@/lib/strategy/strategy-store";
describe("strategy compiler",()=>{it("topologically orders nodes",()=>{expect(compileStrategy(listStrategies()[0]!).orderedNodeIds).toHaveLength(6)})})
