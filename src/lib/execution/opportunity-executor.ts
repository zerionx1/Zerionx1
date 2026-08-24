import "server-only";

import { getConnectedBrokerConnection, getConnectedMt5Credentials } from "@/lib/brokers/connection-store";
import { getConnectedCoinDcxCredentials } from "@/lib/brokers/coindcx-client";
import { coinDcxAuthRequest, getCoinDcxBalances, getCoinDcxMarketDetails } from "@/lib/brokers/coindcx-core";
import { mt5BridgeClient } from "@/lib/brokers/mt5-bridge-client";
import { paperStore } from "@/lib/paper/paper-store";
import { executePaperOrder } from "@/lib/paper/paper-engine";
import { createClientOrderId } from "@/lib/paper/order-id";
import { quoteStore } from "@/lib/market/quote-store";
import { getRiskControls } from "@/lib/risk/trading-risk-controls";
import type { PaperOrder } from "@/types/paper-trading";
import type { MarketKind } from "@/types/market";

type Row = Record<string, unknown>;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export class RiskConfirmationRequiredError extends Error {
  readonly code = "RISK_CONFIRMATION_REQUIRED";
  constructor(
    readonly details: {
      proposedNotional: number;
      defaultGuardNotional: number;
      defaultGuardPercent: number;
      userRiskBudget: number;
      quantity: number;
      symbol: string;
    },
  ) {
    super("This order exceeds Zerion's default paper notional guard. Your saved risk sizing is still being used; explicit confirmation is required to continue.");
    this.name = "RiskConfirmationRequiredError";
  }
}

export type ApprovedTradePlan = {
  opportunityId: string;
  symbol: string;
  market: string;
  side: "buy" | "sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  support?: number | null;
  resistance?: number | null;
  instrumentId?: string | null;
  executionSymbol?: string | null;
  autoTrailing: boolean;
  riskOverrideConfirmed?: boolean;
  trailing?: { enabled?: boolean; trigger?: number | null; distance?: number | null } | null;
};

function riskBudget(balance: number, controls: Awaited<ReturnType<typeof getRiskControls>>) {
  if (!(balance > 0)) throw new Error("Account balance/equity is unavailable for automatic risk sizing");
  const percentBudget = balance * (Math.max(0.1, controls.riskPerTradePct || 1) / 100);
  return controls.maxLossPerTrade != null
    ? Math.max(0, Math.min(percentBudget, Math.abs(controls.maxLossPerTrade)))
    : percentBudget;
}

function paperMarket(market: string): MarketKind {
  if (market === "crypto") return "crypto";
  if (market === "forex") return "forex";
  return "indian-equity";
}

function baseSymbol(symbol: string) {
  return symbol.toUpperCase().replaceAll("/", "").replaceAll("-", "").replaceAll(" ", "");
}

async function executePaper(plan: ApprovedTradePlan) {
  const account = await paperStore.getAccount();
  const controls = await getRiskControls("paper");
  const quote =
    (await quoteStore.get(plan.instrumentId || plan.symbol).catch(() => null)) ??
    (await quoteStore.get(plan.symbol).catch(() => null));
  if (!quote) throw new Error(`No fresh provider quote for ${plan.symbol}`);

  const perUnitRisk = Math.abs(plan.entry - plan.stopLoss);
  if (!(perUnitRisk > 0)) throw new Error("Invalid trade risk distance");
  const budget = riskBudget(account.equity, controls);
  const quantity = Math.max(0.000001, budget / perUnitRisk);
  const now = new Date().toISOString();
  const order: PaperOrder = {
    id: crypto.randomUUID(),
    accountId: account.id,
    symbol: plan.symbol,
    market: paperMarket(plan.market),
    side: plan.side,
    type: "market",
    quantity,
    stopLoss: plan.stopLoss,
    targetPrice: plan.takeProfit,
    maxLoss: budget,
    maxProfit: budget * 3,
    filledQuantity: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    clientOrderId: createClientOrderId(),
  };

  const result = executePaperOrder({
    account,
    quote,
    order,
    riskOverrideConfirmed: Boolean(plan.riskOverrideConfirmed),
  });

  if (!result.accepted && result.reason === "risk_confirmation_required" && result.guard) {
    throw new RiskConfirmationRequiredError({
      ...result.guard,
      userRiskBudget: budget,
      quantity,
      symbol: plan.symbol,
    });
  }

  await paperStore.addOrder(result.order);
  if (!result.accepted || !result.order.averageFillPrice) {
    throw new Error(result.order.rejectionReason ?? result.reason ?? "Paper order rejected");
  }
  await paperStore.applyFill(result.order, result.order.averageFillPrice);

  return {
    broker: "paper",
    executed: true,
    quantity,
    riskBudget: budget,
    order: result.order,
    protectiveStop: plan.stopLoss,
    target: plan.takeProfit,
    autoTrailing: plan.autoTrailing,
    riskOverrideConfirmed: Boolean(plan.riskOverrideConfirmed),
  };
}

async function upstoxJson(path: string, init?: RequestInit) {
  const { token } = await getConnectedBrokerConnection("upstox");
  const accessToken = String(token.access_token ?? "");
  if (!accessToken) throw new Error("Upstox access token is missing");
  const response = await fetch(`https://api.upstox.com${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as Row;
  if (!response.ok) {
    const errors = Array.isArray(body.errors) ? (body.errors as Row[]) : [];
    throw new Error(String(errors[0]?.message ?? body.message ?? `Upstox request failed (${response.status})`));
  }
  return body;
}

function upstoxFundsTotal(value: Row) {
  const data = (value.data ?? {}) as Row;
  const available = (data.available_to_trade ?? {}) as Row;
  return n(available.total);
}

async function resolveUpstoxInstrument(plan: ApprovedTradePlan) {
  const fromPlan = String(plan.instrumentId ?? "").replace(/^upstox:/i, "");
  if (fromPlan.includes("|")) return { instrumentToken: fromPlan, lotSize: 1 };
  const query = encodeURIComponent(plan.symbol);
  const result = await upstoxJson(`/v2/instruments/search?query=${query}`);
  const rows = Array.isArray(result.data) ? (result.data as Row[]) : [];
  const hit = rows.find((r) => {
    const key = String(r.instrument_key ?? r.instrument_token ?? "");
    const name = String(r.trading_symbol ?? r.name ?? r.short_name ?? "");
    return key.includes("|") && baseSymbol(name) === baseSymbol(plan.symbol);
  }) ?? rows.find((r) => String(r.instrument_key ?? r.instrument_token ?? "").includes("|"));
  if (!hit) throw new Error(`No tradeable Upstox instrument found for ${plan.symbol}`);
  return {
    instrumentToken: String(hit.instrument_key ?? hit.instrument_token),
    lotSize: Math.max(1, Math.trunc(n(hit.lot_size) || 1)),
  };
}

async function executeUpstox(plan: ApprovedTradePlan) {
  const controls = await getRiskControls("live");
  const funds = await upstoxJson("/v3/user/get-funds-and-margin", { headers: { "Api-Version": "3.0" } });
  const available = upstoxFundsTotal(funds);
  const budget = riskBudget(available, controls);
  const perUnitRisk = Math.abs(plan.entry - plan.stopLoss);
  if (!(perUnitRisk > 0)) throw new Error("Invalid trade risk distance");
  const { instrumentToken, lotSize } = await resolveUpstoxInstrument(plan);
  const rawQty = Math.floor(budget / perUnitRisk);
  const quantity = Math.floor(rawQty / lotSize) * lotSize;
  if (quantity < lotSize) throw new Error(`Risk budget is too small for the minimum Upstox lot size (${lotSize})`);
  const trailingGap = plan.autoTrailing && plan.trailing?.distance
    ? Math.max(Math.abs(plan.entry - plan.stopLoss) * 0.1, Number(plan.trailing.distance))
    : undefined;
  const order = await upstoxJson("/v3/order/gtt/place", {
    method: "POST",
    body: JSON.stringify({
      type: "MULTIPLE",
      quantity,
      product: "I",
      rules: [
        { strategy: "ENTRY", trigger_type: "IMMEDIATE", trigger_price: plan.entry, market_protection: -1 },
        { strategy: "TARGET", trigger_type: "IMMEDIATE", trigger_price: plan.takeProfit, market_protection: -1 },
        { strategy: "STOPLOSS", trigger_type: "IMMEDIATE", trigger_price: plan.stopLoss, market_protection: -1, ...(trailingGap ? { trailing_gap: trailingGap } : {}) },
      ],
      instrument_token: instrumentToken,
      transaction_type: plan.side.toUpperCase(),
    }),
  });
  return { broker: "upstox", executed: true, quantity, riskBudget: budget, order, protectiveStop: plan.stopLoss, target: plan.takeProfit, autoTrailing: plan.autoTrailing, trailingMode: plan.autoTrailing ? "broker-native-gtt" : "manual-notification" };
}

async function resolveCoinDcxMarket(plan: ApprovedTradePlan) {
  const details = await getCoinDcxMarketDetails();
  const wanted = baseSymbol(plan.symbol);
  const hit = details.find((row) => baseSymbol(String(row.coindcx_name ?? row.symbol ?? "")) === wanted)
    ?? details.find((row) => baseSymbol(String(row.pair ?? "")) === wanted);
  if (!hit) return { market: wanted, ecode: "B" };
  const pair = String(hit.pair ?? "");
  return { market: String(hit.coindcx_name ?? hit.symbol ?? wanted), ecode: pair.includes("-") ? pair.split("-", 1)[0] || "B" : "B" };
}

async function executeCoinDcx(plan: ApprovedTradePlan) {
  const controls = await getRiskControls("live");
  const credentials = await getConnectedCoinDcxCredentials();
  const balances = await getCoinDcxBalances(credentials);
  const usdt = balances.find((b) => b.currency.toUpperCase() === "USDT");
  const inr = balances.find((b) => b.currency.toUpperCase() === "INR");
  const available = n(usdt?.balance) || n(inr?.balance);
  const budget = riskBudget(available, controls);
  const perUnitRisk = Math.abs(plan.entry - plan.stopLoss);
  if (!(perUnitRisk > 0)) throw new Error("Invalid trade risk distance");
  const quantity = Number(Math.max(0.000001, budget / perUnitRisk).toFixed(6));
  const market = await resolveCoinDcxMarket(plan);
  const order = await coinDcxAuthRequest<Row>(credentials, "/exchange/v1/margin/create", {
    market: market.market,
    quantity,
    side: plan.side,
    order_type: "market_order",
    leverage: 1,
    stop_price: plan.stopLoss,
    target_price: plan.takeProfit,
    trailing_sl: plan.autoTrailing,
    ecode: market.ecode,
  });
  return { broker: "coindcx", executed: true, quantity, riskBudget: budget, order, protectiveStop: plan.stopLoss, target: plan.takeProfit, autoTrailing: plan.autoTrailing, trailingMode: plan.autoTrailing ? "broker-native-margin-trailing" : "manual-notification" };
}

async function executeMt5(plan: ApprovedTradePlan) {
  const controls = await getRiskControls("live");
  const credentials = await getConnectedMt5Credentials();
  const account = (await mt5BridgeClient.account(credentials)) as Row;
  const balance = n(account.equity) || n(account.balance);
  const budget = riskBudget(balance, controls);
  const symbol = String(plan.executionSymbol || plan.symbol).replace(/^forex:/i, "");
  const result = await mt5BridgeClient.orderPlace(
    credentials,
    {
      symbol,
      side: plan.side,
      risk_budget: budget,
      stop_loss: plan.stopLoss,
      take_profit: plan.takeProfit,
      auto_trailing: plan.autoTrailing,
      trailing_trigger: plan.trailing?.trigger ?? null,
      trailing_distance: plan.trailing?.distance ?? null,
      comment: `Zerion ${plan.opportunityId.slice(0, 8)}`,
    },
    `opportunity-${plan.opportunityId}`,
  );
  return { broker: "exness-mt5", executed: true, riskBudget: budget, order: result, protectiveStop: plan.stopLoss, target: plan.takeProfit, autoTrailing: plan.autoTrailing, trailingMode: plan.autoTrailing ? "mt5-market-behavior" : "manual-notification" };
}

export async function executeApprovedOpportunity(mode: "paper" | "live", plan: ApprovedTradePlan) {
  if (plan.riskReward < 3) throw new Error("Execution blocked: risk/reward is below 1:3");
  if (mode === "paper") return executePaper(plan);
  if (plan.market === "forex") return executeMt5(plan);
  if (plan.market === "crypto") return executeCoinDcx(plan);
  return executeUpstox(plan);
}
