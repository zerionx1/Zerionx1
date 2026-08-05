import { describe,it,expect } from "vitest"; import { signAuditPayload,verifyAuditPayload } from "@/lib/security/audit-integrity";
describe("audit integrity",()=>{it("detects mutation",()=>{const s="x".repeat(32);const sig=signAuditPayload("a",s);expect(verifyAuditPayload("a",sig,s)).toBe(true);expect(verifyAuditPayload("b",sig,s)).toBe(false);});});
