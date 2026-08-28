import "server-only";
import { adminRest } from "@/lib/supabase/admin-rest";
import type { ZerionScanResult } from "@/lib/agents/types";

function marketFor(symbol: string, instrumentId: string | null) {
  const id = String(instrumentId ?? "").toLowerCase();
  if (id.startsWith("coindcx:")) return "crypto";
  if (id.startsWith("forex:")) return "forex";
  const value = symbol.toUpperCase();
  if (value.includes("USDT") || value.includes("USDC")) return "crypto";
  if (value.includes("XAU") || value.includes("XAG") || /^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)/.test(value.replace(/[\s/-]/g, ""))) return "forex";
  return "india";
}

export async function persistDevelopingSetups(result: ZerionScanResult) {
  const now = Date.now();
  await adminRest(`agent_developing_setups?expires_at=lt.${encodeURIComponent(new Date(now).toISOString())}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
  const rows = result.candidates
    .filter((candidate) => candidate.direction === "neutral" && Number(candidate.tradePlan?.qualityScore ?? 0) >= 60 && candidate.confidence >= 55)
    .sort((a, b) => Number(b.tradePlan?.qualityScore ?? 0) - Number(a.tradePlan?.qualityScore ?? 0) || b.confidence - a.confidence)
    .slice(0, 30)
    .map((candidate) => ({
      symbol: candidate.symbol,
      market: marketFor(candidate.symbol, candidate.tradePlan.instrumentId),
      price: candidate.price,
      confidence: candidate.confidence,
      quality_score: candidate.tradePlan.qualityScore,
      reason: candidate.reason,
      source: candidate.source,
      analysis: { tradePlan: candidate.tradePlan, stages: result.stages, executionPolicy: "developing-not-executable" },
      updated_at: result.scannedAt,
      expires_at: new Date(now + 180_000).toISOString(),
    }));
  if (!rows.length) return [];
  return adminRest<Record<string, unknown>[]>("agent_developing_setups?on_conflict=symbol", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
}
