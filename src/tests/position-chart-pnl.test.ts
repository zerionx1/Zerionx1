import { describe, expect, it } from "vitest";
import { positionPnl } from "@/lib/charts/position-pnl";

describe("chart position P&L", () => {
  it("calculates long profit", () => {
    expect(positionPnl(510, 500, 1)).toBe(10);
  });

  it("calculates long loss", () => {
    expect(positionPnl(490, 500, 1)).toBe(-10);
  });

  it("calculates short profit", () => {
    expect(positionPnl(490, 500, -1)).toBe(10);
  });
});
