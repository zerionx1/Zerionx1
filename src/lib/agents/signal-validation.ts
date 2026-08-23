import "server-only";

import { adminInsert, adminRest, adminSelect } from "@/lib/supabase/admin-rest";
import { quoteStore } from "@/lib/market/quote-store";

type Row = Record<string, unknown>;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type SignalValidationSummary = {
  sampleSize: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number | null;
  calibrated: boolean;
  minimumSample: number;
  minimumObservedWinRate: number;
};

const MIN_SAMPLE = 20;
const MIN_WIN_RATE = 70;

export async function resolveOpenSignalOutcomes() {
  const rows = await adminSelect(
    "signal_outcomes",
    "outcome=eq.open&order=generated_at.asc&limit=100",
  );

  for (const row of rows) {
    const symbol = String(row.symbol ?? "");
    if (!symbol) continue;
    const quote = await quoteStore.get(symbol).catch(() => null);
    if (!quote) continue;

    const side = String(row.side ?? "").toLowerCase();
    const price = n(quote.price);
    const stop = n(row.stop_loss);
    const target = n(row.target_price);
    const expiresAt = Date.parse(String(row.expires_at ?? ""));

    let outcome: "win" | "loss" | "expired" | null = null;
    let rMultiple = 0;
    if (side === "buy") {
      if (target && price >= target) {
        outcome = "win";
        rMultiple = 3;
      } else if (stop && price <= stop) {
        outcome = "loss";
        rMultiple = -1;
      }
    } else if (side === "sell") {
      if (target && price <= target) {
        outcome = "win";
        rMultiple = 3;
      } else if (stop && price >= stop) {
        outcome = "loss";
        rMultiple = -1;
      }
    }

    if (!outcome && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      outcome = "expired";
      rMultiple = 0;
    }
    if (!outcome) continue;

    await adminRest(
      `signal_outcomes?id=eq.${encodeURIComponent(String(row.id))}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          outcome,
          r_multiple: rMultiple,
          last_price: price,
          resolved_at: new Date().toISOString(),
        }),
      },
    );
  }
}

export async function registerSignalOutcome(input: {
  opportunityId: string;
  symbol: string;
  side: "buy" | "sell";
  entry: number;
  stopLoss: number;
  target: number;
  confidence: number;
  qualityScore: number;
  generatedAt: string;
  expiresAt: string;
}) {
  await adminInsert(
    "signal_outcomes?on_conflict=opportunity_id",
    [
      {
        opportunity_id: input.opportunityId,
        symbol: input.symbol,
        side: input.side,
        entry_price: input.entry,
        stop_loss: input.stopLoss,
        target_price: input.target,
        confidence: input.confidence,
        quality_score: input.qualityScore,
        outcome: "open",
        generated_at: input.generatedAt,
        expires_at: input.expiresAt,
      },
    ],
    "resolution=merge-duplicates,return=representation",
  );
}

export async function getSignalValidationSummary(): Promise<SignalValidationSummary> {
  const rows = await adminSelect(
    "signal_outcomes",
    "outcome=in.(win,loss,expired)&order=resolved_at.desc&limit=200",
  );
  const wins = rows.filter((r) => r.outcome === "win").length;
  const losses = rows.filter((r) => r.outcome === "loss").length;
  const expired = rows.filter((r) => r.outcome === "expired").length;
  const resolvedDirectional = wins + losses;
  const winRate = resolvedDirectional
    ? Number(((wins / resolvedDirectional) * 100).toFixed(1))
    : null;

  return {
    sampleSize: resolvedDirectional,
    wins,
    losses,
    expired,
    winRate,
    calibrated: resolvedDirectional >= MIN_SAMPLE,
    minimumSample: MIN_SAMPLE,
    minimumObservedWinRate: MIN_WIN_RATE,
  };
}

export function validationAllowsPublishing(summary: SignalValidationSummary) {
  if (!summary.calibrated) return true;
  return (summary.winRate ?? 0) >= summary.minimumObservedWinRate;
}
