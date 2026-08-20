import { describe, expect, it } from "vitest";

import type { Candle } from "@/types/market";
import type { StrategyDefinition } from "@/types/strategy";

function ema(values: number[], period: number) {
  if (!values.length) return 0;

  const k = 2 / (period + 1);
  let value = values[0]!;

  for (let i = 1; i < values.length; i++) {
    value = values[i]! * k + value * (1 - k);
  }

  return value;
}

function evaluateStrategyDefinition(
  strategy: StrategyDefinition,
  candles: Candle[],
) {
  if (candles.length < 20) {
    throw new Error("Strategy runtime requires at least 20 provider candles");
  }

  const last = candles.at(-1)!;
  const previous = candles.at(-2)!;

  const labels = strategy.nodes
    .map((node) => `${node.label} ${JSON.stringify(node.config ?? {})}`)
    .join(" ")
    .toLowerCase();

  if (labels.includes("ema")) {
    const closes = candles.map((candle) => candle.close);
    const fast = ema(closes.slice(-80), 20);
    const slow = ema(closes.slice(-120), 50);

    if (fast > slow && last.close > fast) {
      return {
        signal: "long" as const,
        reason: "EMA trend alignment bullish",
        price: last.close,
      };
    }

    if (fast < slow && last.close < fast) {
      return {
        signal: "short" as const,
        reason: "EMA trend alignment bearish",
        price: last.close,
      };
    }

    return {
      signal: "flat" as const,
      reason: "EMA trend condition not confirmed",
      price: last.close,
    };
  }

  if (last.close > previous.high) {
    return {
      signal: "long" as const,
      reason: "Provider candle breakout above previous high",
      price: last.close,
    };
  }

  if (last.close < previous.low) {
    return {
      signal: "short" as const,
      reason: "Provider candle breakout below previous low",
      price: last.close,
    };
  }

  return {
    signal: "flat" as const,
    reason: "No deterministic strategy trigger",
    price: last.close,
  };
}

const candles: Candle[] = Array.from({ length: 60 }, (_, i) => ({
  time: new Date(Date.UTC(2026, 7, 20, 0, i)).toISOString(),
  open: 100 + i,
  high: 101 + i,
  low: 99 + i,
  close: 100.5 + i,
  volume: 1000 + i,
}));

const strategy = {
  id: "s1",
  ownerId: "u",
  name: "EMA",
  description: "",
  markets: ["crypto"],
  symbols: ["BTC/USDT"],
  timeframe: "5m",
  status: "paper-ready",
  nodes: [
    {
      id: "ema",
      kind: "indicator",
      label: "EMA 20 / 50",
      x: 0,
      y: 0,
      config: {},
    },
  ],
  edges: [],
  risk: {
    riskPerTradePct: 1,
    maxDailyLossPct: 3,
    maxOpenPositions: 3,
    minRiskReward: 2,
    stopLossMode: "atr",
    takeProfitMode: "risk-multiple",
  },
  tags: [],
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as StrategyDefinition;

describe("strategy runtime evaluator", () => {
  it("evaluates provider candle arrays deterministically", () => {
    const result = evaluateStrategyDefinition(strategy, candles);

    expect(["long", "short", "flat"]).toContain(result.signal);
    expect(result.price).toBe(candles.at(-1)!.close);
  });
});
