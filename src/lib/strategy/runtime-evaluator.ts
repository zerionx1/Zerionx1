import "server-only";

import type { Candle } from "@/types/market";
import type { StrategyDefinition } from "@/types/strategy";

export type RuntimeSignal = "long" | "short" | "flat";

export type StrategyRuntimeEvaluation = {
  signal: RuntimeSignal;
  reason: string;
  price: number;
};

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let value = values[0]!;
  for (let i = 1; i < values.length; i++) {
    value = values[i]! * k + value * (1 - k);
  }
  return value;
}

function rsi(candles: Candle[], period = 14) {
  if (candles.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  const recent = candles.slice(-(period + 1));
  for (let i = 1; i < recent.length; i++) {
    const delta = recent[i]!.close - recent[i - 1]!.close;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  if (!losses) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function evaluateStrategyDefinition(
  strategy: StrategyDefinition,
  candles: Candle[],
): StrategyRuntimeEvaluation {
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
    const closes = candles.map((c) => c.close);
    const fast = ema(closes.slice(-80), 20);
    const slow = ema(closes.slice(-120), 50);
    if (fast > slow && last.close > fast) {
      return { signal: "long", reason: "EMA trend alignment bullish", price: last.close };
    }
    if (fast < slow && last.close < fast) {
      return { signal: "short", reason: "EMA trend alignment bearish", price: last.close };
    }
    return { signal: "flat", reason: "EMA trend condition not confirmed", price: last.close };
  }

  if (labels.includes("rsi")) {
    const value = rsi(candles);
    const previousValue = rsi(candles.slice(0, -1));
    if (previousValue <= 30 && value > 30) {
      return { signal: "long", reason: `RSI recovery ${value.toFixed(1)}`, price: last.close };
    }
    if (previousValue >= 70 && value < 70) {
      return { signal: "short", reason: `RSI reversal ${value.toFixed(1)}`, price: last.close };
    }
    return { signal: "flat", reason: `RSI ${value.toFixed(1)} has no trigger`, price: last.close };
  }

  if (labels.includes("donchian") || labels.includes("channel breakout")) {
    const lookback = candles.slice(-21, -1);
    const high = Math.max(...lookback.map((c) => c.high));
    const low = Math.min(...lookback.map((c) => c.low));
    if (last.close > high) {
      return { signal: "long", reason: "Donchian/channel upside breakout", price: last.close };
    }
    if (last.close < low) {
      return { signal: "short", reason: "Donchian/channel downside breakout", price: last.close };
    }
    return { signal: "flat", reason: "Price remains inside breakout channel", price: last.close };
  }

  if (labels.includes("opening range") || labels.includes("range breakout")) {
    const range = candles.slice(-4, -1);
    const high = Math.max(...range.map((c) => c.high));
    const low = Math.min(...range.map((c) => c.low));
    if (last.close > high) {
      return { signal: "long", reason: "Opening/range breakout above range", price: last.close };
    }
    if (last.close < low) {
      return { signal: "short", reason: "Opening/range breakout below range", price: last.close };
    }
    return { signal: "flat", reason: "Range breakout not confirmed", price: last.close };
  }

  if (last.close > previous.high) {
    return { signal: "long", reason: "Provider candle breakout above previous high", price: last.close };
  }
  if (last.close < previous.low) {
    return { signal: "short", reason: "Provider candle breakout below previous low", price: last.close };
  }
  return { signal: "flat", reason: "No deterministic strategy trigger", price: last.close };
}
