import "server-only";

import type { Plan } from "@/types/entitlements";
import { getPlan } from "@/config/plans";
import { currentUser } from "@/lib/supabase/rest";
import { adminInsert, adminRest, adminSelect } from "@/lib/supabase/admin-rest";
import { getActivePlan } from "@/lib/billing/plan-service";

export type QuotaKind = "ai" | "automation" | "live_execution" | "backtest";

type UsageRow = Record<string, unknown>;

function limit(plan: Plan, kind: QuotaKind) {
  const e = getPlan(plan).entitlements;
  return kind === "ai"
    ? e.aiCreditsPerMonth
    : kind === "automation"
      ? e.automationActionsPerMonth
      : kind === "live_execution"
        ? e.liveExecutionsPerMonth
        : e.backtestRunsPerMonth;
}

function month() {
  return new Date().toISOString().slice(0, 7);
}

async function usageRow(ownerId: string, kind: QuotaKind) {
  const rows = await adminSelect(
    "usage_counters",
    `owner_id=eq.${encodeURIComponent(ownerId)}&month_key=eq.${month()}&kind=eq.${kind}&limit=1`,
  );
  return rows[0] as UsageRow | undefined;
}

export async function quotaStatus(kind: QuotaKind) {
  const user = await currentUser();
  const { plan } = await getActivePlan();
  const max = limit(plan.id, kind);
  const row = await usageRow(user.id, kind);
  const used = Number(row?.used ?? 0);
  return {
    plan: plan.id,
    kind,
    used,
    limit: max,
    remaining: max === null ? null : Math.max(0, max - used),
  };
}

export async function consumeQuota(kind: QuotaKind, amount = 1) {
  const user = await currentUser();
  const status = await quotaStatus(kind);

  if (status.limit !== null && status.used + amount > status.limit) {
    throw new Error(`Your ${kind.replaceAll("_", " ")} limit has been reached`);
  }

  const row = await usageRow(user.id, kind);
  const nextUsed = status.used + amount;
  const now = new Date().toISOString();

  if (row?.id) {
    await adminRest(
      `usage_counters?id=eq.${encodeURIComponent(String(row.id))}&owner_id=eq.${encodeURIComponent(user.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ used: nextUsed, updated_at: now }),
      },
    );
  } else {
    await adminInsert("usage_counters", [
      {
        owner_id: user.id,
        month_key: month(),
        kind,
        used: nextUsed,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  return {
    ...status,
    used: nextUsed,
    remaining:
      status.limit === null ? null : Math.max(0, status.limit - nextUsed),
  };
}
