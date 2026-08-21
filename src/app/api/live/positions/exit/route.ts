import { fail, ok } from "@/lib/security/api-response";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { closeCTraderPosition } from "@/lib/brokers/ctrader-json-client";

type Body =
  | {
      broker: "upstox";
      instrumentToken?: string;
      quantity?: number;
      product?: string;
      segment?: string;
      exitAll?: boolean;
    }
  | {
      broker: "ctrader";
      accountId: string;
      environment?: "live" | "demo";
      positionId: string;
      volume: number;
    };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body?.broker) {
    return fail("VALIDATION_ERROR", "broker is required", 400);
  }

  try {
    if (body.broker === "upstox") {
      if (body.exitAll === true) {
        return ok(await upstoxClient.exitAllPositions(body.segment));
      }

      const instrumentToken = body.instrumentToken?.trim() ?? "";
      const quantity = Number(body.quantity ?? 0);
      const product = body.product?.trim() || "I";

      if (
        !instrumentToken ||
        !Number.isFinite(quantity) ||
        quantity === 0
      ) {
        return fail(
          "VALIDATION_ERROR",
          "instrumentToken and non-zero quantity are required for an exact Upstox position exit",
          400,
        );
      }

      return ok(
        await upstoxClient.squareOffPositionV3({
          instrumentToken,
          quantity,
          product,
        }),
      );
    }

    if (!body.accountId || !body.positionId || !body.volume) {
      return fail(
        "VALIDATION_ERROR",
        "accountId, positionId and volume are required",
        400,
      );
    }

    return ok(
      await closeCTraderPosition({
        accountId: body.accountId,
        isLive: body.environment !== "demo",
        positionId: body.positionId,
        volume: Number(body.volume),
      }),
    );
  } catch (error) {
    return fail(
      "LIVE_EXIT_FAILED",
      error instanceof Error ? error.message : "Could not exit live position",
      502,
    );
  }
}
