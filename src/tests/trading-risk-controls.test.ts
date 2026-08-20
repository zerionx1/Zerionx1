import { describe, expect, it } from "vitest";

import type {
  RiskContext,
  RiskDecision,
  TradingRiskControls,
} from "@/types/risk-controls";

function enforceRiskControls(
  controls: TradingRiskControls,
  context: RiskContext,
): RiskDecision {
  if (
    controls.stopAfterDailyLoss &&
    controls.dailyMaxLoss != null &&
    context.dailyPnl <= -Math.abs(controls.dailyMaxLoss)
  ) {
    return { allowed: false, reason: "Daily maximum loss reached" };
  }

  if (
    controls.stopAfterDailyTarget &&
    controls.dailyProfitTarget != null &&
    context.dailyPnl >= controls.dailyProfitTarget
  ) {
    return { allowed: false, reason: "Daily profit target reached" };
  }

  if (context.openPositions >= controls.maxOpenPositions) {
    return { allowed: false, reason: "Maximum open positions reached" };
  }

  if (context.tradesToday >= controls.maxTradesPerDay) {
    return { allowed: false, reason: "Maximum trades per day reached" };
  }

  if (
    controls.maxTotalExposure != null &&
    context.totalExposure + (context.proposedExposure ?? 0) >
      controls.maxTotalExposure
  ) {
    return {
      allowed: false,
      reason: "Maximum total exposure would be exceeded",
    };
  }

  if (
    controls.maxLossPerTrade != null &&
    context.proposedMaxLoss != null &&
    context.proposedMaxLoss > controls.maxLossPerTrade
  ) {
    return {
      allowed: false,
      reason: "Maximum loss per trade would be exceeded",
    };
  }

  return { allowed: true };
}

const controls: TradingRiskControls = {
  mode: "paper",
  dailyProfitTarget: 1000,
  dailyMaxLoss: 500,
  maxLossPerTrade: 200,
  riskPerTradePct: 1,
  maxOpenPositions: 2,
  maxTotalExposure: 10000,
  maxTradesPerDay: 5,
  stopAfterDailyLoss: true,
  stopAfterDailyTarget: true,
  defaultStopLossPct: 1,
  defaultTakeProfitPct: 2,
  minRiskReward: 2,
  trailingStopEnabled: false,
  trailingStopPct: null,
  autoPaperExecution: false,
};

describe("trading risk controls", () => {
  it("blocks after daily max loss", () => {
    expect(
      enforceRiskControls(controls, {
        dailyPnl: -500,
        openPositions: 0,
        totalExposure: 0,
        tradesToday: 0,
      }).allowed,
    ).toBe(false);
  });

  it("blocks exposure overflow", () => {
    expect(
      enforceRiskControls(controls, {
        dailyPnl: 0,
        openPositions: 0,
        totalExposure: 9000,
        tradesToday: 0,
        proposedExposure: 2000,
      }).allowed,
    ).toBe(false);
  });

  it("allows compliant order", () => {
    expect(
      enforceRiskControls(controls, {
        dailyPnl: 0,
        openPositions: 1,
        totalExposure: 3000,
        tradesToday: 1,
        proposedExposure: 1000,
        proposedMaxLoss: 100,
      }).allowed,
    ).toBe(true);
  });
});
