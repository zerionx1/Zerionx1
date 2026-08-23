import "server-only";

import { quoteStore } from "@/lib/market/quote-store";

export type ScanDirection = "long-watch" | "short-watch" | "neutral";

export type OpportunityTradePlan = {
  side: "buy" | "sell" | "none";
  entry: number | null;
  stopLoss: number | null;
  targets: number[];
  trailing: {
    enabled: boolean;
    trigger: number | null;
    distance: number | null;
  };
  riskReward: number | null;
  maxLossPercent: number | null;
  maxProfitPercent: number | null;
  validityMinutes: number;
  invalidation: string;
};

export type ScanOpportunity = {
  symbol: string;
  price: number;
  direction: ScanDirection;
  confidence: number;
  reason: string;
  source: string;
  requiresUserApproval: true;
  tradePlan: OpportunityTradePlan;
};

function round(value: number, price: number) {
  const decimals = price < 1 ? 6 : price < 100 ? 4 : 2;
  return Number(value.toFixed(decimals));
}

function neutralPlan(): OpportunityTradePlan {
  return {
    side: "none",
    entry: null,
    stopLoss: null,
    targets: [],
    trailing: { enabled: false, trigger: null, distance: null },
    riskReward: null,
    maxLossPercent: null,
    maxProfitPercent: null,
    validityMinutes: 10,
    invalidation: "No qualified directional setup.",
  };
}

export async function deterministicMarketScan(
  symbols: string[],
): Promise<ScanOpportunity[]> {
  const quotes = await quoteStore.list(symbols);

  return quotes
    .map((q): ScanOpportunity => {
      const price = Number(q.price);
      const open = Number(q.open || price);
      const high = Number(q.high || price);
      const low = Number(q.low || price);
      const previousClose = Number(q.previousClose || price);
      const sessionPct = Number(q.changePercent || 0);

      const range = Math.max(high - low, price * 0.0015);
      const rangePct = (range / Math.max(price, 1e-9)) * 100;
      const positionInRange =
        range > 0 ? Math.max(0, Math.min(1, (price - low) / range)) : 0.5;
      const fromOpenPct = ((price - open) / Math.max(open, 1e-9)) * 100;
      const fromPrevPct =
        ((price - previousClose) / Math.max(previousClose, 1e-9)) * 100;

      // Symmetric scoring: bearish evidence subtracts exactly as bullish
      // evidence adds. This removes the previous LONG bias.
      let score = 0;
      score += Math.max(-3, Math.min(3, sessionPct)) * 1.35;
      score += Math.max(-2, Math.min(2, fromOpenPct)) * 1.15;
      score += Math.max(-2, Math.min(2, fromPrevPct)) * 0.8;
      score += (positionInRange - 0.5) * 4;

      const directionalThreshold = Math.max(1.2, Math.min(2.4, rangePct * 0.55));
      const direction: ScanDirection =
        score >= directionalThreshold
          ? "long-watch"
          : score <= -directionalThreshold
            ? "short-watch"
            : "neutral";

      const strength = Math.abs(score);
      const confidence =
        direction === "neutral"
          ? Math.min(59, Math.round(42 + strength * 4))
          : Math.min(
              88,
              Math.max(
                61,
                Math.round(
                  58 +
                    Math.min(18, strength * 4.5) +
                    Math.min(8, Math.abs(sessionPct) * 1.6),
                ),
              ),
            );

      if (direction === "neutral") {
        return {
          symbol: q.symbol,
          price,
          direction,
          confidence,
          reason:
            "No qualified directional setup: momentum, session position and open/previous-close confirmation are mixed.",
          source: q.source,
          requiresUserApproval: true as const,
          tradePlan: neutralPlan(),
        };
      }

      const isLong = direction === "long-watch";
      // Risk distance adapts to live session range, but has sane floors/caps.
      const riskPct = Math.max(0.35, Math.min(2.25, rangePct * 0.42));
      const riskDistance = price * (riskPct / 100);
      const stop = isLong ? price - riskDistance : price + riskDistance;
      const target1 = isLong ? price + riskDistance * 1.25 : price - riskDistance * 1.25;
      const target2 = isLong ? price + riskDistance * 2 : price - riskDistance * 2;
      const target3 = isLong ? price + riskDistance * 2.75 : price - riskDistance * 2.75;
      const maxProfitPct = riskPct * 2.75;

      const validityMinutes =
        strength >= 4.5 ? 18 : strength >= 3.2 ? 28 : strength >= 2.2 ? 40 : 55;

      const reasonBits = [
        `${sessionPct >= 0 ? "+" : ""}${sessionPct.toFixed(2)}% session`,
        `${fromOpenPct >= 0 ? "+" : ""}${fromOpenPct.toFixed(2)}% vs open`,
        `${Math.round(positionInRange * 100)}% of session range`,
      ];

      return {
        symbol: q.symbol,
        price,
        direction,
        confidence,
        reason: `${isLong ? "Bullish" : "Bearish"} multi-factor setup: ${reasonBits.join(" · ")}.`,
        source: q.source,
        requiresUserApproval: true as const,
        tradePlan: {
          side: isLong ? "buy" : "sell",
          entry: round(price, price),
          stopLoss: round(stop, price),
          targets: [
            round(target1, price),
            round(target2, price),
            round(target3, price),
          ],
          trailing: {
            enabled: true,
            trigger: round(target1, price),
            distance: round(riskDistance * 0.7, price),
          },
          riskReward: 2,
          maxLossPercent: Number(riskPct.toFixed(2)),
          maxProfitPercent: Number(maxProfitPct.toFixed(2)),
          validityMinutes,
          invalidation: isLong
            ? "Invalidate if price loses the stop level or bullish structure fails."
            : "Invalidate if price breaks above the stop level or bearish structure fails.",
        },
      };
    })
    .sort((a, b) => {
      if (a.direction === "neutral" && b.direction !== "neutral") return 1;
      if (b.direction === "neutral" && a.direction !== "neutral") return -1;
      return b.confidence - a.confidence;
    });
}
