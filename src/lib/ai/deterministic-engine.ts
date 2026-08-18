type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type DeterministicAssessment = {
  action: "BUY" | "SELL" | "NO_TRADE";
  score: number;
  reasons: string[];
  invalidations: string[];
};

function sma(values: number[], period: number) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function momentum(values: number[], lookback = 5) {
  if (values.length <= lookback) return 0;
  const current = values.at(-1) ?? 0;
  const old = values.at(-(lookback + 1)) ?? current;
  if (!old) return 0;
  return ((current - old) / old) * 100;
}

export function assessDeterministically(candles: Candle[]): DeterministicAssessment {
  const closes = candles.map((candle) => candle.close);
  const fast = sma(closes, 9);
  const slow = sma(closes, 21);
  const mom = momentum(closes);

  if (!fast || !slow || candles.length < 25) {
    return {
      action: "NO_TRADE",
      score: 0,
      reasons: ["Not enough fresh candles for a reliable rules-based assessment."],
      invalidations: ["Wait for more data."],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const invalidations: string[] = [];

  if (fast > slow) {
    score += 35;
    reasons.push("Short trend is above the slower trend.");
  } else {
    score -= 35;
    reasons.push("Short trend is below the slower trend.");
  }

  if (mom > 0.15) {
    score += 25;
    reasons.push("Recent momentum is positive.");
  } else if (mom < -0.15) {
    score -= 25;
    reasons.push("Recent momentum is negative.");
  } else {
    invalidations.push("Momentum is weak.");
  }

  const last = candles.at(-1)!;
  const range = Math.max(last.high - last.low, 1e-9);
  const closeLocation = (last.close - last.low) / range;

  if (closeLocation > 0.7) {
    score += 15;
    reasons.push("Latest candle closed near its high.");
  } else if (closeLocation < 0.3) {
    score -= 15;
    reasons.push("Latest candle closed near its low.");
  }

  const abs = Math.abs(score);
  if (abs < 45) {
    return {
      action: "NO_TRADE",
      score: abs,
      reasons,
      invalidations: [
        ...invalidations,
        "Rules do not agree strongly enough.",
      ],
    };
  }

  return {
    action: score > 0 ? "BUY" : "SELL",
    score: Math.min(100, abs),
    reasons,
    invalidations,
  };
}
