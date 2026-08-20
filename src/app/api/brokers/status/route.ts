import { fail, ok } from "@/lib/security/api-response";
import { currentUser, select, update } from "@/lib/supabase/rest";
import { upstoxClient } from "@/lib/brokers/upstox-client";

export async function GET() {
  const user = await currentUser();
  const connection = (
    await select(
      "broker_connections",
      `owner_id=eq.${user.id}&broker_key=eq.upstox&limit=1`,
    )
  )[0];

  if (!connection) {
    return ok({
      broker: "upstox",
      state: "disconnected",
      persisted: false,
      account: null,
      lastSync: null,
      tokenHealth: "missing",
      feedHealth: "disconnected",
    });
  }

  if (connection.status !== "connected") {
    return ok({
      broker: "upstox",
      state:
        connection.status === "degraded" ? "auth-required" : connection.status,
      persisted: true,
      account: null,
      lastSync: connection.updated_at ?? null,
      tokenHealth:
        connection.status === "degraded" ? "auth-required" : "unknown",
      feedHealth: "disconnected",
    });
  }

  try {
    const profile = (await upstoxClient.profile()) as {
      data?: Record<string, unknown>;
    };
    const now = new Date().toISOString();
    await update(
      "broker_connections",
      `owner_id=eq.${user.id}&broker_key=eq.upstox`,
      {
        updated_at: now,
      },
    );
    return ok({
      broker: "upstox",
      state: "connected",
      persisted: true,
      account: profile.data ?? null,
      lastSync: now,
      tokenHealth: "valid",
      feedHealth: "available",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstox verification failed";
    const authRequired = /token|auth|unauthor|expired|401/i.test(message);
    if (authRequired) {
      await update(
        "broker_connections",
        `owner_id=eq.${user.id}&broker_key=eq.upstox`,
        {
          status: "degraded",
          updated_at: new Date().toISOString(),
        },
      );
    }
    return fail(
      authRequired ? "UPSTOX_AUTH_REQUIRED" : "UPSTOX_HEALTH_DEGRADED",
      message,
      authRequired ? 401 : 502,
      {
        broker: "upstox",
        state: authRequired ? "auth-required" : "degraded",
        persisted: true,
      },
    );
  }
}
