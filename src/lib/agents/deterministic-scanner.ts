import "server-only";

import { quoteStore } from "@/lib/market/quote-store";

export type ScanDirection = "long-watch" | "short-watch" | "neutral";
export type OpportunityTradePlan = {
  side: "buy" | "sell" | "none";
  entry: number | null;
  stopLoss: number | null;
  targets: number[];
  support: number | null;
  resistance: number | null;
  instrumentId: string | null;
  executionSymbol: string | null;
  trailing: {
    enabled: boolean;
    trigger: number | null;
    distance: number | null;
    rule?: string;
  };
  riskReward: number | null;
  qualityScore: number;
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
  const d = price < 1 ? 6 : price < 100 ? 4 : 2;
  return Number(value.toFixed(d));
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function executionSymbol(symbol: string, instrumentId: string) {
  const clean = instrumentId.replace(/^upstox:/i, "").replace(/^coindcx:/i, "");
  return clean || symbol;
}
function neutralPlan(instrumentId: string | null = null): OpportunityTradePlan {
  return {
    side: "none",
    entry: null,
    stopLoss: null,
    targets: [],
    support: null,
    resistance: null,
    instrumentId,
    executionSymbol: null,
    trailing: { enabled: false, trigger: null, distance: null },
    riskReward: null,
    qualityScore: 0,
    maxLossPercent: null,
    maxProfitPercent: null,
    validityMinutes: 10,
    invalidation: "No qualified directional setup.",
  };
}

export async function deterministicMarketScan(symbols: string[]): Promise<ScanOpportunity[]> {
  const quotes = await quoteStore.list(symbols);
  return quotes
    .map((q): ScanOpportunity => {
      const price = Number(q.price);
      const open = Number(q.open || price);
      const high = Number(q.high || price);
      const low = Number(q.low || price);
      const prev = Number(q.previousClose || price);
      const sessionPct = Number(q.changePercent || 0);
      const range = Math.max(high - low, price * 0.0015);
      const rangePct = (range / Math.max(price, 1e-9)) * 100;
      const pos = range > 0 ? clamp((price - low) / range, 0, 1) : 0.5;
      const fromOpen = ((price - open) / Math.max(open, 1e-9)) * 100;
      const fromPrev = ((price - prev) / Math.max(prev, 1e-9)) * 100;
      const instrumentId = String(q.instrumentId || q.symbol || "");

      const sessionDirection = Math.sign(sessionPct);
      const openDirection = Math.sign(fromOpen);
      const prevDirection = Math.sign(fromPrev);
      const rangeDirection = pos >= 0.58 ? 1 : pos <= 0.42 ? -1 : 0;
      const alignedLong = [sessionDirection, openDirection, prevDirection, rangeDirection].filter((v) => v > 0).length;
      const alignedShort = [sessionDirection, openDirection, prevDirection, rangeDirection].filter((v) => v < 0).length;

      let score = 0;
      score += clamp(sessionPct, -3, 3) * 1.45;
      score += clamp(fromOpen, -2, 2) * 1.2;
      score += clamp(fromPrev, -2, 2) * 0.9;
      score += (pos - 0.5) * 4.4;

      const threshold = clamp(rangePct * 0.55, 1.25, 2.5);
      let direction: ScanDirection =
        score >= threshold && alignedLong >= 3
          ? "long-watch"
          : score <= -threshold && alignedShort >= 3
            ? "short-watch"
            : "neutral";

      const strength = Math.abs(score);
      const qualityScore = clamp(
        Math.round(
          52 +
            Math.min(18, strength * 3.2) +
            Math.min(10, Math.abs(sessionPct) * 1.5) +
            Math.max(alignedLong, alignedShort) * 4,
        ),
        0,
        94,
      );
      const confidence =
        direction === "neutral"
          ? Math.min(69, qualityScore)
          : clamp(Math.max(70, qualityScore), 70, 88);

      if (direction === "neutral" || confidence < 70 || qualityScore < 74) {
        const biasLong = score >= 0;
        const aligned = Math.max(alignedLong, alignedShort);
        const developing = qualityScore >= 60 && aligned >= 2 && strength >= 0.8;
        const devSupport = low + range * 0.16;
        const devResistance = high - range * 0.16;
        direction = "neutral";
        return {
          symbol: q.symbol,
          price,
          direction,
          confidence: developing ? clamp(Math.max(55, qualityScore - 5), 55, 69) : Math.min(54, confidence),
          reason: developing
            ? `DEVELOPING ${biasLong ? "LONG" : "SHORT"}: ${aligned}/4 factors aligned · quality ${qualityScore} · waiting for the full Zerion qualification gate.`
            : "NO TRADE: Zerion requires at least 3 aligned directional factors plus a quality score of 74 before publishing a setup.",
          source: q.source,
          requiresUserApproval: true as const,
          tradePlan: developing
            ? { ...neutralPlan(instrumentId), support: round(devSupport, price), resistance: round(devResistance, price), qualityScore, executionSymbol: executionSymbol(q.symbol, instrumentId), validityMinutes: 3, invalidation: "developing-not-executable: wait for 3 aligned factors, confidence >=70, quality >=74 and 1:3 R:R." }
            : neutralPlan(instrumentId),
        };
      }

      const isLong = direction === "long-watch";
      const support = low + range * 0.16;
      const resistance = high - range * 0.16;
      const minRisk = (price * clamp(rangePct * 0.28, 0.3, 1.2)) / 100;
      const structureStop = isLong ? support : resistance;
      let stop = isLong
        ? Math.min(structureStop, price - minRisk)
        : Math.max(structureStop, price + minRisk);
      let risk = Math.abs(price - stop);
      const maxRisk = price * 0.018;
      if (risk > maxRisk) {
        risk = maxRisk;
        stop = isLong ? price - risk : price + risk;
      }
      if (risk <= 0) {
        return {
          symbol: q.symbol,
          price,
          direction: "neutral",
          confidence: 59,
          reason: "NO TRADE: invalid market structure for a controlled stop.",
          source: q.source,
          requiresUserApproval: true as const,
          tradePlan: neutralPlan(instrumentId),
        };
      }

      const target = isLong ? price + risk * 3 : price - risk * 3;
      const riskPct = (risk / price) * 100;
      const trailingTrigger = isLong ? price + risk * 1.25 : price - risk * 1.25;
      const reasonBits = [
        `${sessionPct >= 0 ? "+" : ""}${sessionPct.toFixed(2)}% session`,
        `${fromOpen >= 0 ? "+" : ""}${fromOpen.toFixed(2)}% vs open`,
        `${Math.round(pos * 100)}% of session range`,
        `${isLong ? alignedLong : alignedShort}/4 factors aligned`,
        "strict 1:3 R:R",
      ];

      return {
        symbol: q.symbol,
        price,
        direction,
        confidence,
        reason: `${isLong ? "Bullish" : "Bearish"} qualified setup: ${reasonBits.join(" · ")}.`,
        source: q.source,
        requiresUserApproval: true as const,
        tradePlan: {
          side: isLong ? "buy" : "sell",
          entry: round(price, price),
          stopLoss: round(stop, price),
          targets: [round(target, price)],
          support: round(support, price),
          resistance: round(resistance, price),
          instrumentId,
          executionSymbol: executionSymbol(q.symbol, instrumentId),
          trailing: {
            enabled: true,
            trigger: round(trailingTrigger, price),
            distance: round(risk * 0.65, price),
            rule:
              "Move the stop only after favourable structure/price expansion. Auto mode modifies the protective stop; manual mode emits a notification.",
          },
          riskReward: 3,
          qualityScore,
          maxLossPercent: Number(riskPct.toFixed(2)),
          maxProfitPercent: Number((riskPct * 3).toFixed(2)),
          validityMinutes: strength >= 4.5 ? 15 : strength >= 3.2 ? 22 : 30,
          invalidation: isLong
            ? "Invalidate if price loses support/stop or bullish structure fails."
            : "Invalidate if price clears resistance/stop or bearish structure fails.",
        },
      };
    })
    .sort((a, b) => {
      if (a.direction === "neutral" && b.direction !== "neutral") return 1;
      if (b.direction === "neutral" && a.direction !== "neutral") return -1;
      if (b.tradePlan.qualityScore !== a.tradePlan.qualityScore) {
        return b.tradePlan.qualityScore - a.tradePlan.qualityScore;
      }
      return b.confidence - a.confidence;
    });
}
