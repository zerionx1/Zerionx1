import { fail, ok } from "@/lib/security/api-response";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { getConnectedMt5Credentials } from "@/lib/brokers/connection-store";
import { mt5BridgeClient } from "@/lib/brokers/mt5-bridge-client";

type Body =
  | { broker: "upstox"; instrumentToken?: string; quantity?: number; product?: string; segment?: string; exitAll?: boolean }
  | { broker: "exness-mt5"; ticket: number; volume?: number | null; deviation?: number };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.broker) return fail("VALIDATION_ERROR", "broker is required", 400);
  try {
    if (body.broker === "upstox") {
      if (body.exitAll === true) return ok(await upstoxClient.exitAllPositions(body.segment));
      const instrumentToken = body.instrumentToken?.trim() ?? "";
      const quantity = Number(body.quantity ?? 0);
      const product = body.product?.trim() || "I";
      if (!instrumentToken || !Number.isFinite(quantity) || quantity === 0) {
        return fail("VALIDATION_ERROR", "instrumentToken and non-zero quantity are required for an exact Upstox position exit", 400);
      }
      return ok(await upstoxClient.squareOffPositionV3({ instrumentToken, quantity, product }));
    }
    if (!Number.isFinite(body.ticket)) return fail("VALIDATION_ERROR", "MT5 ticket is required", 400);
    const credentials = await getConnectedMt5Credentials();
    return ok(await mt5BridgeClient.orderClose(credentials, {
      ticket: Number(body.ticket), volume: body.volume ?? null, deviation: Math.max(0, Math.min(100, Number(body.deviation ?? 20))),
    }));
  } catch (error) {
    return fail("LIVE_EXIT_FAILED", error instanceof Error ? error.message : "Could not exit live position", 502);
  }
}
