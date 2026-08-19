import { fail, ok } from "@/lib/security/api-response";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";

type SubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth)
    return fail("VALIDATION_ERROR", "Invalid push subscription", 400);

  const existing = (await select(
    "push_subscriptions",
    `owner_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(body.endpoint)}&limit=1`
  ))[0];

  const payload = {
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: request.headers.get("user-agent"),
    enabled: true,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    await update(
      "push_subscriptions",
      `id=eq.${String(existing.id)}&owner_id=eq.${user.id}`,
      payload
    );
  } else {
    await insert("push_subscriptions", {
      owner_id: user.id,
      endpoint: body.endpoint,
      ...payload
    });
  }

  const prefs = (await select(
    "user_documents",
    `owner_id=eq.${user.id}&kind=eq.notifications&limit=1`
  ))[0];
  const oldPayload =
    prefs?.payload && typeof prefs.payload === "object"
      ? (prefs.payload as Record<string, unknown>)
      : {};
  const nextPayload = {
    ...oldPayload,
    in_app: true,
    push: true,
    market_alerts: true
  };

  if (prefs) {
    await update(
      "user_documents",
      `id=eq.${String(prefs.id)}&owner_id=eq.${user.id}`,
      { payload: nextPayload, updated_at: new Date().toISOString() }
    );
  } else {
    await insert("user_documents", {
      owner_id: user.id,
      kind: "notifications",
      payload: nextPayload,
      updated_at: new Date().toISOString()
    });
  }

  return ok({ subscribed: true });
}
