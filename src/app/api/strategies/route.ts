import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import {
  listUserStrategies,
  saveUserStrategy,
} from "@/lib/strategy/strategy-repository";
import { strategySchema } from "@/lib/validation/strategy";
export async function GET() {
  try {
    return apiSuccess({ strategies: await listUserStrategies() });
  } catch (e) {
    return apiError(
      "STRATEGY_LIST_FAILED",
      e instanceof Error ? e.message : "Could not load strategies",
      500,
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = strategySchema.safeParse(body);
    if (!parsed.success)
      return apiError(
        "VALIDATION_ERROR",
        "Invalid strategy definition",
        400,
        parsed.error.flatten(),
      );
    return apiSuccess({ strategy: await saveUserStrategy(parsed.data) }, 201);
  } catch (e) {
    return apiError(
      "STRATEGY_SAVE_FAILED",
      e instanceof Error ? e.message : "Could not save strategy",
      500,
    );
  }
}
