import "server-only";
import { adminInsert } from "@/lib/supabase/admin-rest";
import type { ZerionScanResult } from "./types";

function inferMarket(symbol: string) {
  const s = symbol.toUpperCase();
  if (s.includes("USDT") || s.includes("BTC") || s.includes("ETH"))
    return "crypto";
  if (s.includes("/") || s.includes("XAU")) return "forex";
  return "india";
}

export async function persistScanOpportunities(result: ZerionScanResult) {
  const bucket = result.scannedAt.slice(0, 13);
  const qualified = result.candidates.filter(
    (candidate) =>
      candidate.direction !== "neutral" && candidate.confidence >= 60,
  );

  if (!qualified.length) return [];

  const rows = qualified.map((candidate) => {
    const fingerprint = `${bucket}:${candidate.symbol}:${candidate.direction}`;
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
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
      analysis: { stages: result.stages },
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
