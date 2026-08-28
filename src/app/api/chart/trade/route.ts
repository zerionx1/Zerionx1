import { executeApprovedOpportunity, RiskConfirmationRequiredError } from "@/lib/execution/opportunity-executor";
import { emitUserNotification } from "@/lib/notifications/notification-events";
import { fail, ok } from "@/lib/security/api-response";
import { currentUser, insert, update } from "@/lib/supabase/rest";
import type { MarketKind } from "@/types/market";

type Body = {
  confirmed?: boolean;
  mode?: "paper" | "live";
  instrumentId?: string;
  symbol?: string;
  market?: MarketKind;
  side?: "buy" | "sell";
  quantity?: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  autoTrailing?: boolean;
  riskOverrideConfirmed?: boolean;
  strategy?: string;
  rationale?: string;
};

const markets = new Set<MarketKind>(["indian-equity", "indian-index", "indian-futures", "indian-options", "crypto", "forex"]);
const n = (value: unknown) => Number(value);

function brokerFor(mode: "paper" | "live", market: MarketKind) {
  if (mode === "paper") return "paper";
  if (market === "crypto") return "coindcx";
  if (market === "forex") return "exness-mt5";
  return "upstox";
}

function providerIdentityOk(instrumentId: string, market: MarketKind) {
  const value = instrumentId.toLowerCase();
  if (market === "crypto") return value.startsWith("coindcx:") || value.startsWith("coindcx-futures:");
  if (market === "forex") return value.startsWith("forex:");
  return value.startsWith("upstox:");
}

export async function POST(request: Request) {
  const user = await currentUser();
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || body.confirmed !== true || !body.mode || !body.market || !markets.has(body.market)) {
    return fail("CONFIRMATION_REQUIRED", "Explicit Paper or Live confirmation with a supported market is required", 400);
  }
  const instrumentId = String(body.instrumentId ?? "").trim();
  const symbol = String(body.symbol ?? "").trim();
  const side = body.side;
  const quantity = n(body.quantity), entry = n(body.entry), stopLoss = n(body.stopLoss), takeProfit = n(body.takeProfit);
  if (!instrumentId || !symbol || !side || ![quantity, entry, stopLoss, takeProfit].every((value) => Number.isFinite(value) && value > 0)) {
    return fail("VALIDATION_ERROR", "Instrument, symbol, side, quantity, entry, stop loss and target are required", 400);
  }
  if (!providerIdentityOk(instrumentId, body.market)) {
    return fail("PROVIDER_MISMATCH", "Selected instrument does not match the execution provider for this market", 422);
  }
  const geometryOk = side === "buy" ? stopLoss < entry && takeProfit > entry : stopLoss > entry && takeProfit < entry;
  if (!geometryOk) return fail("INVALID_RISK_GEOMETRY", "Stop loss and target must remain on the correct side of entry", 422);
  const risk = Math.abs(entry - stopLoss), reward = Math.abs(takeProfit - entry), riskReward = risk > 0 ? reward / risk : 0;
  if (!(riskReward >= 3)) return fail("RISK_REWARD_BLOCKED", "Zerion chart execution requires at least 1:3 risk/reward", 422, { riskReward });

  const broker = brokerFor(body.mode, body.market);
  const manualId = `manual-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const orderPayload = { manualId, instrumentId, symbol, market: body.market, side, quantity, entry, stopLoss, takeProfit, riskReward, autoTrailing: body.autoTrailing === true, riskOverrideConfirmed: body.riskOverrideConfirmed === true, source: "chart-execution-panel" };
  const created = await insert<Record<string, unknown>>("trade_proposals", {
    owner_id: user.id,
    broker_key: broker,
    strategy_id: null,
    mode: body.mode,
    status: "executing",
    symbol,
    order_payload: orderPayload,
    rationale: [String(body.strategy ?? "Zerion chart manual execution"), String(body.rationale ?? "User-confirmed chart execution")],
    confidence: null,
    confirmed_at: now,
    created_at: now,
    updated_at: now,
  });
  const proposal = created[0];
  if (!proposal?.id) return fail("PROPOSAL_CREATE_FAILED", "Unable to create chart execution record", 500);

  try {
    const execution = await executeApprovedOpportunity(body.mode, {
      opportunityId: manualId,
      instrumentId,
      executionSymbol: symbol,
      symbol,
      market: body.market,
      side,
      quantity,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      autoTrailing: body.autoTrailing === true,
      riskOverrideConfirmed: body.riskOverrideConfirmed === true,
      trailing: { enabled: body.autoTrailing === true, trigger: side === "buy" ? entry + risk * 1.25 : entry - risk * 1.25, distance: risk * 0.65 },
    });
    await update("trade_proposals", `owner_id=eq.${user.id}&id=eq.${encodeURIComponent(String(proposal.id))}`, { status: "executed", execution_result: execution, order_payload: { ...orderPayload, execution }, updated_at: new Date().toISOString() });
    await emitUserNotification({
      kind: body.mode === "paper" ? "paper-order-filled" : "live-order-update",
      title: `${symbol} ${body.mode === "paper" ? "paper" : "live"} order accepted`,
      body: `${side.toUpperCase()} ${quantity} · Entry ${entry} · SL ${stopLoss} · Target ${takeProfit}`,
      priority: "normal",
      eventKey: `chart-trade:${proposal.id}:accepted`,
      actionUrl: body.mode === "paper" ? "/dashboard/paper/positions" : "/dashboard/positions",
      data: { proposalId: proposal.id, manualId, broker, instrumentId, symbol, side, quantity, status: "accepted" },
    }).catch(() => {});
    return ok({ proposalId: proposal.id, broker, execution, message: `${body.mode === "paper" ? "Paper" : "Live"} ${side.toUpperCase()} submitted for ${symbol}.` }, 201);
  } catch (error) {
    if (error instanceof RiskConfirmationRequiredError) {
      await update("trade_proposals", `owner_id=eq.${user.id}&id=eq.${encodeURIComponent(String(proposal.id))}`, { status: "awaiting-risk-confirmation", execution_result: { ok: false, code: error.code, ...error.details }, updated_at: new Date().toISOString() }).catch(() => {});
      return fail(error.code, error.message, 409, error.details);
    }
    const message = error instanceof Error ? error.message : "Chart execution failed";
    await update("trade_proposals", `owner_id=eq.${user.id}&id=eq.${encodeURIComponent(String(proposal.id))}`, { status: "execution-failed", execution_result: { ok: false, error: message }, updated_at: new Date().toISOString() }).catch(() => {});
    await emitUserNotification({ kind: body.mode === "paper" ? "paper-order-rejected" : "live-order-update", title: `${symbol} order rejected`, body: message, priority: "high", eventKey: `chart-trade:${proposal.id}:rejected`, actionUrl: "/dashboard/notifications", data: { proposalId: proposal.id, broker, instrumentId, symbol, status: "rejected" } }).catch(() => {});
    return fail("CHART_EXECUTION_FAILED", message, 502);
  }
}
