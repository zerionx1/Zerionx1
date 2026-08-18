import { assessDeterministically } from "@/lib/ai/deterministic-engine";
import { ok, fail } from "@/lib/security/api-response";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        candles?: Array<{
          open: number;
          high: number;
          low: number;
          close: number;
          volume?: number;
        }>;
      }
    | null;

  if (!body?.candles || body.candles.length < 2) {
    return fail("VALIDATION_ERROR", "Candles are required", 400);
  }

  return ok(assessDeterministically(body.candles));
}
