import { currentUser, insert, select, update } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

function record(v: unknown) {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
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
    const seen = new Set(existing.map((row) => String(row.opportunity_id ?? "")));

    const strongest = opportunities
      .map((row) => {
        const analysis = record(row.analysis);
        const plan = record(analysis.tradePlan);
        return { row, analysis, plan, quality: Number(plan.qualityScore ?? row.confidence ?? 0) };
      })
      .filter(({ row, plan, quality }) =>
        !seen.has(String(row.id)) &&
        Number(row.confidence) >= 70 &&
        quality >= 74 &&
        Number(plan.riskReward) >= 3,
      )
      .sort((a, b) => b.quality - a.quality || Number(b.row.confidence) - Number(a.row.confidence))[0];

    if (strongest) {
      const { row, analysis, plan, quality } = strongest;
      const targets = Array.isArray(plan.targets) ? plan.targets : [];
      const validation = record(analysis.validation);
      await insert("user_notifications", {
        owner_id: user.id,
        opportunity_id: row.id,
        kind: "agent-opportunity",
        title: `${String(row.symbol)} ${String(row.direction).toUpperCase()} opportunity`,
        body: `${quality}% setup quality · ${String(row.reason)}`,
        priority: quality >= 80 ? "high" : "normal",
        action_url: "/dashboard/notifications",
        event_key: `agent-opportunity-${String(row.id)}`,
        event_data: {
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
          trailing: record(plan.trailing).rule ?? (record(plan.trailing).enabled ? "Dynamic" : "Off"),
          expiresAt: row.expires_at ?? null,
          opportunityId: row.id,
        },
      });
    }

    const notifications = await select(
      "user_notifications",
      `owner_id=eq.${user.id}&order=created_at.desc&limit=100`,
    );
    return ok({ notifications });
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
    const body = (await request.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) return fail("VALIDATION_ERROR", "Notification id is required", 400);
    await update(
      "user_notifications",
      `id=eq.${encodeURIComponent(body.id)}&owner_id=eq.${user.id}`,
      { read_at: new Date().toISOString() },
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
