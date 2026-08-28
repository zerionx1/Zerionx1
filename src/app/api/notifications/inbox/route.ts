import { currentUser, insert, select, update } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

function record(v: unknown) {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function isFeedNoise(row: Record<string, unknown>) {
  const kind = String(row.kind ?? "").toLowerCase();
  const title = String(row.title ?? "").toLowerCase();
  const body = String(row.body ?? "").toLowerCase();
  return (
    kind === "market-feed-status" ||
    kind === "feed-status" ||
    title.includes("market feed disconnected") ||
    title.includes("market feed temporarily unavailable") ||
    body.includes("stopped receiving fresh provider ticks") ||
    body.includes("has not received fresh provider traffic")
  );
}

function stableKey(row: Record<string, unknown>) {
  return String(
    row.event_key ??
      row.opportunity_id ??
      `${String(row.kind ?? "notice")}:${String(row.title ?? "")}:${String(row.body ?? "")}`,
  );
}

function dedupe(rows: Record<string, unknown>[]) {
  const used = new Set<string>();
  return rows.filter((row) => {
    if (isFeedNoise(row)) return false;
    const key = stableKey(row);
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });
}

function eventData(
  row: Record<string, unknown>,
  analysis: Record<string, unknown>,
  plan: Record<string, unknown>,
  quality: number,
) {
  const targets = Array.isArray(plan.targets) ? plan.targets : [];
  const validation = record(analysis.validation);
  return {
    symbol: row.symbol,
    market: row.market,
    direction: row.direction,
    confidence: row.confidence,
    qualityScore: quality,
    validationState: validation.calibrated ? "calibrated" : "collecting",
    observedWinRate: validation.winRate ?? null,
    validationSample: validation.sampleSize ?? 0,
    entry: plan.entry ?? row.price ?? null,
    quantity: null,
    stopLoss: plan.stopLoss ?? null,
    target: targets[0] ?? null,
    support: plan.support ?? null,
    resistance: plan.resistance ?? null,
    maxRisk: plan.maxLossPercent ?? null,
    riskReward: plan.riskReward ?? null,
    instrumentId: plan.instrumentId ?? null,
    executionSymbol: plan.executionSymbol ?? null,
    trailing:
      record(plan.trailing).rule ??
      (record(plan.trailing).enabled ? "Dynamic" : "Off"),
    expiresAt: row.expires_at ?? null,
    opportunityId: row.id,
    strategy: "Zerion deterministic multi-factor structure + momentum",
    basis: [row.reason, `${quality}% quality`, `${plan.riskReward ?? "—"} R:R`].filter(Boolean),
    invalidation: plan.invalidation ?? null,
    continuouslyRevalidated: true,
    scanCadenceSeconds: 30,
  };
}

export async function GET() {
  try {
    const user = await currentUser();
    const now = new Date().toISOString();
    const opportunities = await select(
      "agent_opportunities",
      `status=eq.active&expires_at=gt.${encodeURIComponent(now)}&order=confidence.desc&limit=10`,
    );
    const existing = await select(
      "user_notifications",
      `owner_id=eq.${user.id}&kind=eq.agent-opportunity&order=created_at.desc&limit=200`,
    );
    const byOpportunity = new Map(
      existing.map((row) => [String(row.opportunity_id ?? ""), row]),
    );

    const strongest = opportunities
      .map((row) => {
        const analysis = record(row.analysis);
        const plan = record(analysis.tradePlan);
        return { row, analysis, plan, quality: Number(plan.qualityScore ?? row.confidence ?? 0) };
      })
      .filter(({ row, plan, quality }) => Number(row.confidence) >= 70 && quality >= 74 && Number(plan.riskReward) >= 3)
      .sort((a, b) => b.quality - a.quality || Number(b.row.confidence) - Number(a.row.confidence))
      .slice(0, 12);

    for (const { row, analysis, plan, quality } of strongest) {
      const data = eventData(row, analysis, plan, quality);
      const old = byOpportunity.get(String(row.id));
      if (old?.id) {
        await update("user_notifications", `id=eq.${encodeURIComponent(String(old.id))}&owner_id=eq.${user.id}`, {
          title: `${String(row.symbol)} ${String(row.direction).toUpperCase()} opportunity`,
          body: `${quality}% setup quality · ${String(row.reason)}`, priority: quality >= 80 ? "high" : "normal", event_data: data, action_url: "/dashboard/notifications",
        });
      } else {
        await insert("user_notifications", { owner_id: user.id, opportunity_id: row.id, kind: "agent-opportunity", title: `${String(row.symbol)} ${String(row.direction).toUpperCase()} opportunity`, body: `${quality}% setup quality · ${String(row.reason)}`, priority: quality >= 80 ? "high" : "normal", action_url: "/dashboard/notifications", event_key: `agent-opportunity-${String(row.id)}`, event_data: data });
      }
    }

    const notifications = await select(
      "user_notifications",
      `owner_id=eq.${user.id}&order=created_at.desc&limit=100`,
    );

    return ok({ notifications: dedupe(notifications) });
  } catch (error) {
    return fail(
      "NOTIFICATION_INBOX_FAILED",
      error instanceof Error ? error.message : "Unable to load notifications",
      400,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    const body = (await request.json().catch(() => null)) as
      | { id?: string; all?: boolean }
      | null;
    const now = new Date().toISOString();

    if (body?.all === true) {
      await update(
        "user_notifications",
        `owner_id=eq.${user.id}&read_at=is.null`,
        { read_at: now },
      );
      return ok({ updated: true, all: true });
    }

    if (!body?.id) {
      return fail("VALIDATION_ERROR", "Notification id is required", 400);
    }

    await update(
      "user_notifications",
      `id=eq.${encodeURIComponent(body.id)}&owner_id=eq.${user.id}`,
      { read_at: now },
    );
    return ok({ updated: true });
  } catch (error) {
    return fail(
      "NOTIFICATION_UPDATE_FAILED",
      error instanceof Error ? error.message : "Unable to update notification",
      400,
    );
  }
}
