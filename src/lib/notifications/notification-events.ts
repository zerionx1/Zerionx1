import "server-only";

import webpush from "web-push";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";

export type ZerionNotificationKind =
  | "paper-order-filled"
  | "paper-order-rejected"
  | "paper-position-closed"
  | "live-order-update"
  | "strategy-signal"
  | "strategy-action"
  | "stop-loss-triggered"
  | "target-reached"
  | "daily-loss-threshold"
  | "daily-target-reached"
  | "broker-disconnected"
  | "stale-market-feed"
  | "market-alert"
  | "opportunity-signal"
  | "system-warning";

export type NotificationEventInput = {
  kind: ZerionNotificationKind;
  title: string;
  body: string;
  priority?: "low" | "normal" | "high";
  eventKey?: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
};

function configurePush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:alerts@zerionx1.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function emitUserNotification(input: NotificationEventInput) {
  const user = await currentUser();

  if (input.eventKey) {
    const existing = await select(
      "user_notifications",
      `owner_id=eq.${user.id}&event_key=eq.${encodeURIComponent(input.eventKey)}&limit=1`,
    );
    if (existing[0]) return existing[0];
  }

  const rows = await insert<Record<string, unknown>>("user_notifications", {
    owner_id: user.id,
    kind: input.kind,
    title: input.title,
    body: input.body,
    priority: input.priority ?? "normal",
    event_key: input.eventKey ?? null,
    action_url: input.actionUrl ?? null,
    event_data: input.data ?? {},
    created_at: new Date().toISOString(),
  });
  const notification = rows[0];

  if (!notification || !configurePush()) return notification;

  const subscriptions = await select(
    "push_subscriptions",
    `owner_id=eq.${user.id}&enabled=eq.true`,
  );

  let delivered = false;
  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: String(row.endpoint),
            keys: {
              p256dh: String(row.p256dh),
              auth: String(row.auth),
            },
          },
          JSON.stringify({
            title: input.title,
            body: input.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            url: input.actionUrl ?? "/dashboard/notifications",
            data: input.data ?? {},
          }),
        );
        delivered = true;
      } catch (error) {
        const code =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        if (code === 404 || code === 410) {
          await update(
            "push_subscriptions",
            `id=eq.${String(row.id)}&owner_id=eq.${user.id}`,
            { enabled: false, updated_at: new Date().toISOString() },
          );
        }
      }
    }),
  );

  if (delivered) {
    await update(
      "user_notifications",
      `id=eq.${String(notification.id)}&owner_id=eq.${user.id}`,
      { delivered_push_at: new Date().toISOString() },
    );
  }

  return notification;
}
