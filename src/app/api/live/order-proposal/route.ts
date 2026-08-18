import { ok, fail } from "@/lib/security/api-response";
import { currentUser, insert } from "@/lib/supabase/rest";
import { getUpstoxAccessTokenForUplink } from "@/lib/brokers/upstox-client";

type UpstoxOrder = {
  quantity: number;
  product: "I" | "D" | "MTF";
  validity: "DAY" | "IOC";
  price?: number;
  trigger_price?: number;
  instrument_token: string;
  order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  transaction_type: "BUY" | "SELL";
  disclosed_quantity?: number;
  is_amo: boolean;
  tag?: string;
};

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as
    | {
        broker?: "upstox";
        strategyId?: string;
        rationale?: string[];
        confidence?: number;
        order?: UpstoxOrder;
      }
    | null;

  if (body?.broker !== "upstox" || !body.order) {
    return fail("VALIDATION_ERROR", "A valid Upstox order is required", 400);
  }

  const proposalId = crypto.randomUUID();
  await insert("trade_proposals", {
    id: proposalId,
    owner_id: user.id,
    broker_key: "upstox",
    strategy_id: body.strategyId ?? null,
    mode: "live",
    status: "awaiting-user-confirmation",
    order_payload: body.order,
    rationale: body.rationale ?? [],
    confidence: body.confidence ?? null,
    created_at: new Date().toISOString(),
  });

  const accessToken = await getUpstoxAccessTokenForUplink();
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/dashboard/execution?proposal=${proposalId}`;

  return ok({
    proposalId,
    confirmation: {
      kind: "upstox-uplink-business",
      action: "https://api.upstox.com/v2/uplink/order/place",
      method: "POST",
      fields: {
        access_token: accessToken,
        redirect_url: redirectUrl,
        data: JSON.stringify([{ ...body.order, tag: body.order.tag ?? `zerion-${proposalId}` }]),
        is_editable: "true",
      },
    },
  });
}
