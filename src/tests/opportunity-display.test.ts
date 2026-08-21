import { describe, expect, it } from "vitest";
import {
  directionOf,
  displayNumber,
  isOpportunityExpired,
} from "@/lib/notifications/opportunity-display";

describe("opportunity display helpers", () => {
  it("normalizes direction", () => {
    expect(directionOf({ direction: "buy" })).toBe("BUY");
  });

  it("marks stale opportunities expired", () => {
    expect(
      isOpportunityExpired(
        { expiresAt: "2026-01-01T00:00:00.000Z" },
        Date.parse("2026-01-02T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("formats missing numbers safely", () => {
    expect(displayNumber(undefined)).toBe("—");
  });
});
