import { describe,it,expect } from "vitest"; import { isConsentFresh } from "@/lib/compliance/consent";
describe("consent",()=>{it("accepts recent consent",()=>expect(isConsentFresh({userId:"u",orderIntentId:"o",textVersion:"1",acceptedAt:new Date().toISOString()})).toBe(true));});
