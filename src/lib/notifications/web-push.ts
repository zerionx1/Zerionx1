import "server-only";

import webpush from "web-push";
import { adminSelect } from "@/lib/supabase/admin-rest";

let configured = false;

function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? "https://zerionx1.vercel.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushToUser(
  ownerId: string,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!configure()) return { sent: 0, failed: 0, configured: false };

  const rows = await adminSelect(
    "push_subscriptions",
    `owner_id=eq.${ownerId}&enabled=eq.true&select=id,endpoint,p256dh,auth`
  );

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const endpoint = String(row.endpoint ?? "");
    const p256dh = String(row.p256dh ?? "");
    const auth = String(row.auth ?? "");
    if (!endpoint || !p256dh || !auth) continue;

    try {
      await webpush.sendNotification(
        { endpoint, keys: { p256dh, auth } },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ?? "/dashboard/notifications",
          tag: payload.tag ?? "zerion-market-alert",
        }),
        { TTL: 300, urgency: "high", topic: (payload.tag ?? "zerion-alert").slice(0, 32) }
      );
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, configured: true };
}
