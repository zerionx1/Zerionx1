import "server-only";
import { adminInsert, adminRest } from "@/lib/supabase/admin-rest";
import type { ZerionScanResult } from "./types";
import {
  getSignalValidationSummary,
  registerSignalOutcome,
  resolveOpenSignalOutcomes,
  validationAllowsPublishing,
} from "./signal-validation";

function inferMarket(symbol: string) {
  const s = symbol.toUpperCase();
  if (s.includes("USDT") || s.includes("USDC") || s.includes("BTC") || s.includes("ETH") || s.includes("SOL")) return "crypto";
  if (s.includes("XAU") || s.includes("XAG") || /^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)[/-]?(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)$/.test(s.replaceAll(" ", ""))) return "forex";
  return "india";
}
function directionCode(direction: string) {
  return direction === "long-watch" ? "L" : direction === "short-watch" ? "S" : "N";
}
function level(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toPrecision(6) : "na";
}

async function expirePreviousActiveSetups() {
  await adminRest("agent_opportunities?status=eq.active", {
    method: "PATCH",
    body: JSON.stringify({ status: "expired" }),
  });
}

export async function persistScanOpportunities(result: ZerionScanResult) {
  await resolveOpenSignalOutcomes().catch(() => {});
  // Every scan is a revalidation pass. Old cards must not remain actionable when
  // the current market structure no longer qualifies.
  await expirePreviousActiveSetups().catch(() => {});

  const validation = await getSignalValidationSummary().catch(() => ({
    sampleSize: 0,
    wins: 0,
    losses: 0,
    expired: 0,
    winRate: null,
    calibrated: false,
    minimumSample: 20,
    minimumObservedWinRate: 70,
  }));

  if (!validationAllowsPublishing(validation)) return [];

  const candidate = result.candidates
    .filter(
      (c) =>
        c.direction !== "neutral" &&
        c.confidence >= 70 &&
        c.tradePlan.qualityScore >= 74 &&
        c.tradePlan.entry &&
        c.tradePlan.stopLoss &&
        c.tradePlan.targets.length >= 1 &&
        Number(c.tradePlan.riskReward) >= 3,
    )
    .sort((a, b) => {
      if (b.tradePlan.qualityScore !== a.tradePlan.qualityScore) {
        return b.tradePlan.qualityScore - a.tradePlan.qualityScore;
      }
      return b.confidence - a.confidence;
    })[0];

  if (!candidate) return [];

  const generatedAt = new Date(result.scannedAt);
  const expires = new Date(
    generatedAt.getTime() + candidate.tradePlan.validityMinutes * 60_000,
  ).toISOString();
  // Five-minute fingerprint buckets allow a continuing setup to refresh often
  // without flooding users with a brand-new notification every 30 seconds.
  const bucket = Math.floor(generatedAt.getTime() / (5 * 60_000));
  const fingerprint = [
    bucket,
    candidate.symbol,
    directionCode(candidate.direction),
    level(candidate.tradePlan.entry),
    level(candidate.tradePlan.stopLoss),
    level(candidate.tradePlan.targets[0]),
  ].join(":");

  const row = {
    fingerprint,
    symbol: candidate.symbol,
    market: inferMarket(candidate.symbol),
    price: candidate.price,
    direction: candidate.direction,
    confidence: candidate.confidence,
    reason: candidate.reason,
    source: candidate.source,
    mode: result.mode,
    analysis: {
      stages: result.stages,
      tradePlan: candidate.tradePlan,
      validation,
      antiOvertrading: {
        oneBestSetupPerScan: true,
        continuousRevalidation: true,
        scanCadenceSeconds: 30,
        fingerprintBucketMinutes: 5,
        minimumConfidence: 70,
        minimumQualityScore: 74,
        minimumRiskReward: 3,
        neutralSignalsPersisted: false,
      },
    },
    status: "active",
    requires_user_approval: true,
    generated_at: result.scannedAt,
    expires_at: expires,
  };

  const inserted = await adminInsert<Record<string, unknown>>(
    "agent_opportunities?on_conflict=fingerprint",
    [row],
    "resolution=merge-duplicates,return=representation",
  );

  const saved = inserted[0];
  if (saved?.id && candidate.tradePlan.side !== "none") {
    await registerSignalOutcome({
      opportunityId: String(saved.id),
      symbol: candidate.symbol,
      side: candidate.tradePlan.side,
      entry: Number(candidate.tradePlan.entry),
      stopLoss: Number(candidate.tradePlan.stopLoss),
      target: Number(candidate.tradePlan.targets[0]),
      confidence: candidate.confidence,
      qualityScore: candidate.tradePlan.qualityScore,
      generatedAt: result.scannedAt,
      expiresAt: expires,
    }).catch(() => {});
  }

  return inserted;
}
