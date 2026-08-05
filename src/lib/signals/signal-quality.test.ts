import { describe,expect,it } from "vitest";import { qualityFromConfidence } from "@/lib/signals/signal-quality";
describe("signal quality",()=>{it("maps confidence bands",()=>{expect(qualityFromConfidence(81)).toBe("high");expect(qualityFromConfidence(70)).toBe("medium");expect(qualityFromConfidence(40)).toBe("low")})});
