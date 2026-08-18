import { ok, fail } from "@/lib/security/api-response";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";
import { placeCTraderOrder } from "@/lib/brokers/ctrader-json-client";

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as
    | {
        proposalId?: string;
        confirmation?: "CONFIRM";
        accountId?: string;
        environment?: "live" | "demo";
        symbolId?: string;
        side?: "BUY" | "SELL";
        volume?: number;
        orderType?: "MARKET" | "LIMIT" | "STOP";
        limitPrice?: number;
        stopPrice?: number;
      }
    | null;

  if (
    body?.confirmation !== "CONFIRM" ||
    !body.proposalId ||
    !body.accountId ||
    !body.symbolId ||
    !body.side ||
    !body.volume ||
    body.volume <= 0
  ) {
    return fail(
      "CONFIRMATION_REQUIRED",
      "A complete user-confirmed cTrader order is required",
      400,
    );
  }

  const proposal = (
    await select(
      "trade_proposals",
      `id=eq.${body.proposalId}&owner_id=eq.${user.id}&status=eq.awaiting-user-confirmation&limit=1`,
    )
  )[0];

  if (!proposal) {
    return fail("PROPOSAL_NOT_FOUND", "Trade proposal is missing or no longer active", 404);
  }

  const result = await placeCTraderOrder({
    accountId: body.accountId,
    isLive: body.environment !== "demo",
    symbolId: body.symbolId,
    side: body.side,
    volume: body.volume,
    orderType: body.orderType,
    limitPrice: body.limitPrice,
    stopPrice: body.stopPrice,
    label: "Zerion X1",
    comment: `Confirmed proposal ${body.proposalId}`,
  });

  await update(
    "trade_proposals",
    `id=eq.${body.proposalId}&owner_id=eq.${user.id}`,
    {
      status: "submitted",
      execution_result: result,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  );

  return ok({ proposalId: body.proposalId, result });
}
