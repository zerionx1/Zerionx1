import "server-only";

import { adminInsert } from "@/lib/supabase/admin-rest";
import type { ZerionScanResult } from "./types";

function inferMarket(symbol: string) {
  const s = symbol.toUpperCase();
  if (
    s.includes("USDT") ||
    s.includes("USDC") ||
    s.includes("BTC") ||
    s.includes("ETH") ||
    s.includes("SOL")
  ) {
    return "crypto";
  }
  if (
    s.includes("XAU") ||
    s.includes("XAG") ||
    /^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)[/-]?(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)$/.test(
      s.replaceAll(" ", ""),
    )
  ) {
    return "forex";
  }
  return "india";
}

function directionCode(direction: string) {
  return direction === "long-watch" ? "L" : direction === "short-watch" ? "S" : "N";
}

export async function persistScanOpportunities(result: ZerionScanResult) {
  const qualified = result.candidates.filter(
    (candidate) =>
      candidate.direction !== "neutral" &&
      candidate.confidence >= 64 &&
      candidate.tradePlan.entry &&
      candidate.tradePlan.stopLoss &&
      candidate.tradePlan.targets.length >= 2,
  );

  if (!qualified.length) return [];

  const rows = qualified.map((candidate) => {
    // Dynamic validity replaces the old hard-coded one-hour expiry.
    const generatedAt = new Date(result.scannedAt);
    const expires = new Date(
      generatedAt.getTime() + candidate.tradePlan.validityMinutes * 60_000,
    ).toISOString();

    // 15-minute regime bucket prevents notification spam while allowing a
    // genuinely changed direction/setup to be surfaced without waiting 1 hour.
    const bucketMs = 15 * 60_000;
    const bucket = Math.floor(generatedAt.getTime() / bucketMs);
    const fingerprint = `${bucket}:${candidate.symbol}:${directionCode(candidate.direction)}`;

    return {
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
        antiOvertrading: {
          fingerprintBucketMinutes: 15,
          requiresFreshQualifiedSetup: true,
          neutralSignalsPersisted: false,
        },
      },
      status: "active",
      requires_user_approval: true,
      generated_at: result.scannedAt,
      expires_at: expires,
    };
  });

  return adminInsert<Record<string, unknown>>(
    "agent_opportunities?on_conflict=fingerprint",
    rows,
    "resolution=merge-duplicates,return=representation",
  );
}
