import "server-only";

import { getPlan } from "@/config/plans";
import { adminInsert, adminSelect } from "@/lib/supabase/admin-rest";
import { sendPushToUser } from "@/lib/notifications/web-push";
import type { Plan } from "@/types/entitlements";

type Opportunity = Record<string, unknown>;

function planAllowsMarket(planId: string, market: string) {
  try {
    const plan = getPlan(planId as Plan);
    if (market === "india") return plan.entitlements.markets.includes("india");
    if (market === "crypto") return plan.entitlements.markets.includes("crypto");
    if (market === "forex") return plan.entitlements.markets.includes("forex");
    return false;
  } catch {
    return false;
  }
}

export async function dispatchOpportunityNotifications(opportunities: Opportunity[]) {
  if (!opportunities.length) return { users: 0, notifications: 0, pushes: 0 };

  const subscriptions = await adminSelect(
    "subscriptions",
    "status=eq.active&select=owner_id,plan_id,expires_at,created_at&order=created_at.desc"
  );

  const latestByUser = new Map<string, Record<string, unknown>>();
  for (const row of subscriptions) {
    const ownerId = String(row.owner_id ?? "");
    if (!ownerId || latestByUser.has(ownerId)) continue;
    const expiresAt = row.expires_at ? Date.parse(String(row.expires_at)) : null;
    if (expiresAt && expiresAt <= Date.now()) continue;
    latestByUser.set(ownerId, row);
  }

  let notifications = 0;
  let pushes = 0;

  for (const [ownerId, subscription] of latestByUser) {
    const planId = String(subscription.plan_id ?? "free");

    for (const opportunity of opportunities) {
      const market = String(opportunity.market ?? "");
      if (!planAllowsMarket(planId, market)) continue;

      const opportunityId = String(opportunity.id ?? "");
      if (!opportunityId) continue;

      const existing = await adminSelect(
        "user_notifications",
        `owner_id=eq.${ownerId}&opportunity_id=eq.${opportunityId}&limit=1`
      );
      if (existing.length) continue;

      const symbol = String(opportunity.symbol ?? "Market");
      const confidence = Number(opportunity.confidence ?? 0);
      const direction = String(opportunity.direction ?? "watch");
      const reason = String(opportunity.reason ?? "A market condition was detected.");

      await adminInsert(
        "user_notifications",
        {
          owner_id: ownerId,
          opportunity_id: opportunityId,
          kind: "agent-opportunity",
          title: `${symbol} opportunity`,
          body: `${direction} · ${confidence}% confidence · ${reason}`,
          priority: confidence >= 75 ? "high" : "normal",
        },
        "return=minimal"
      );
      notifications += 1;

      const result = await sendPushToUser(ownerId, {
        title: `${symbol} · ${confidence}% Zerion signal`,
        body: `${direction} · ${reason}`,
        url: "/dashboard/notifications",
        tag: `zx-${opportunityId}`.slice(0, 32),
      });
      pushes += result.sent;
    }
  }

  return { users: latestByUser.size, notifications, pushes };
}
