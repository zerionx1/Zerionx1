import { describe, expect, it } from "vitest";
import { planEntitlements } from "./plans";

describe("plans", () => {
  it("keeps forex locked below the forex-enabled tiers", () => {
    expect(planEntitlements.free.markets).not.toContain("forex");
    expect(planEntitlements.starter.markets).not.toContain("forex");
    expect(planEntitlements.pro.markets).not.toContain("forex");
  });

  it("enables forex on higher tiers", () => {
    expect(planEntitlements.elite.markets).toContain("forex");
    expect(planEntitlements.ultra.markets).toContain("forex");
    expect(planEntitlements.prime.markets).toContain("forex");
  });
});
