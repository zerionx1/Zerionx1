import {
  currentUser,
  insert,
  select,
  update,
} from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

export async function GET() {
  try {
    const user = await currentUser();
    const now = new Date().toISOString();

    const opportunities = await select(
      "agent_opportunities",
      `status=eq.active&expires_at=gt.${encodeURIComponent(
        now,
      )}&order=confidence.desc&limit=50`,
    );

    const existing = await select(
      "user_notifications",
      `owner_id=eq.${user.id}&kind=eq.agent-opportunity&order=created_at.desc&limit=200`,
    );

    const seen = new Set(
      existing.map((row) =>
        String(row.opportunity_id ?? ""),
      ),
    );

    const missing = opportunities
      .filter((row) => !seen.has(String(row.id)))
      .map((row) => ({
        owner_id: user.id,
        opportunity_id: row.id,
        kind: "agent-opportunity",
        title: `${String(row.symbol)} ${String(
          row.direction,
        ).toUpperCase()} opportunity`,
        body: `${Number(
          row.confidence,
        )}% confidence · ${String(row.reason)}`,
        priority:
          Number(row.confidence) >= 75
            ? "high"
            : "normal",
        action_url: "/dashboard/notifications",
        event_key: `agent-opportunity-${String(row.id)}`,
        event_data: {
          symbol: row.symbol,
          direction: row.direction,
          confidence: row.confidence,
          entry:
            row.entry ??
            row.entry_price ??
            row.price ??
            null,
          quantity: row.quantity ?? row.qty ?? null,
          stopLoss:
            row.stop_loss ??
            row.stopLoss ??
            row.sl ??
            null,
          target:
            row.target ??
            row.take_profit ??
            row.takeProfit ??
            row.tp ??
            null,
          maxRisk:
            row.max_risk ??
            row.maxRisk ??
            row.risk ??
            null,
          riskReward:
            row.risk_reward ??
            row.riskReward ??
            row.rr ??
            null,
          trailing:
            row.trailing ??
            row.trailing_rule ??
            null,
          expiresAt: row.expires_at ?? null,
          opportunityId: row.id,
        },
      }));

    if (missing.length) {
      await insert("user_notifications", missing);
    }

    const notifications = await select(
      "user_notifications",
      `owner_id=eq.${user.id}&order=created_at.desc&limit=100`,
    );

    return ok({ notifications });
  } catch (error) {
    return fail(
      "NOTIFICATION_INBOX_FAILED",
      error instanceof Error
        ? error.message
        : "Unable to load notifications",
      400,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    const body = (await request
      .json()
      .catch(() => null)) as { id?: string } | null;

    if (!body?.id) {
      return fail(
        "VALIDATION_ERROR",
        "Notification id is required",
        400,
      );
    }

    await update(
      "user_notifications",
      `id=eq.${encodeURIComponent(
        body.id,
      )}&owner_id=eq.${user.id}`,
      { read_at: new Date().toISOString() },
    );

    return ok({ updated: true });
  } catch (error) {
    return fail(
      "NOTIFICATION_UPDATE_FAILED",
      error instanceof Error
        ? error.message
        : "Unable to update notification",
      400,
    );
  }
}
