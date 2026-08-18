import { fail, ok } from "@/lib/security/api-response";
import { paperStore } from "@/lib/paper/paper-store";
import { quoteStore } from "@/lib/market/quote-store";
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    positionId?: string;
  } | null;
  if (!body?.positionId)
    return fail("VALIDATION_ERROR", "positionId is required", 400);
  try {
    const p = await paperStore.getPosition(body.positionId);
    if (!p)
      return fail("PAPER_POSITION_NOT_FOUND", "Paper position not found", 404);
    const quote = await quoteStore.get(p.symbol);
    const exitPrice = quote?.price ?? p.markPrice ?? p.averagePrice;
    return ok(await paperStore.closePosition(body.positionId, exitPrice));
  } catch (e) {
    return fail(
      "PAPER_EXIT_FAILED",
      e instanceof Error ? e.message : "Could not close paper position",
      400,
    );
  }
}
