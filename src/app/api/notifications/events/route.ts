import { fail, ok } from "@/lib/security/api-response";
import {
  emitUserNotification,
  type NotificationEventInput,
} from "@/lib/notifications/notification-events";

const allowed = new Set([
  "paper-order-filled",
  "paper-order-rejected",
  "paper-position-closed",
  "live-order-update",
  "strategy-signal",
  "strategy-action",
  "stop-loss-triggered",
  "target-reached",
  "daily-loss-threshold",
  "daily-target-reached",
  "broker-disconnected",
  "stale-market-feed",
  "market-alert",
  "opportunity-signal",
  "system-warning",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | NotificationEventInput
    | null;
  if (
    !body?.kind ||
    !allowed.has(body.kind) ||
    !body.title?.trim() ||
    !body.body?.trim()
  ) {
    return fail("VALIDATION_ERROR", "Valid notification event required", 400);
  }
  return ok(await emitUserNotification(body), 201);
}
