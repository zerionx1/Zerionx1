import { describe, expect, it } from "vitest";
import type { ZerionNotificationKind } from "@/lib/notifications/notification-events";

describe("notification event contract", () => {
  it("supports deterministic feed and trading event kinds", () => {
    const kinds: ZerionNotificationKind[] = [
      "paper-order-filled",
      "paper-order-rejected",
      "live-order-update",
      "strategy-signal",
      "stale-market-feed",
      "market-alert",
      "system-warning",
    ];
    expect(kinds).toHaveLength(7);
  });
});
