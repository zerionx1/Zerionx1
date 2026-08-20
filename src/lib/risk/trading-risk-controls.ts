import "server-only";

import { currentUser, insert, select, update } from "@/lib/supabase/rest";
import type {
  RiskContext,
  RiskDecision,
  TradingMode,
  TradingRiskControls,
} from "@/types/risk-controls";

type Row = Record<string, unknown>;

const n = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const nullable = (value: unknown) =>
  value === null || value === undefined || value === "" ? null : n(value);

function fromRow(row: Row, mode: TradingMode): TradingRiskControls {
  return {
    mode,
    dailyProfitTarget: nullable(row.daily_profit_target),
    dailyMaxLoss: nullable(row.daily_max_loss),
    maxLossPerTrade: nullable(row.max_loss_per_trade),
    riskPerTradePct: n(row.risk_per_trade_pct, 1),
    maxOpenPositions: n(row.max_open_positions, 3),
    maxTotalExposure: nullable(row.max_total_exposure),
    maxTradesPerDay: n(row.max_trades_per_day, 20),
    stopAfterDailyLoss: Boolean(row.stop_after_daily_loss ?? true),
    stopAfterDailyTarget: Boolean(row.stop_after_daily_target ?? false),
    defaultStopLossPct: nullable(row.default_stop_loss_pct),
    defaultTakeProfitPct: nullable(row.default_take_profit_pct),
    minRiskReward: n(row.min_risk_reward, 1.5),
    trailingStopEnabled: Boolean(row.trailing_stop_enabled ?? false),
    trailingStopPct: nullable(row.trailing_stop_pct),
    autoPaperExecution: Boolean(row.auto_paper_execution ?? false),
  };
}

const defaults = (mode: TradingMode): TradingRiskControls => ({
  mode,
  dailyProfitTarget: null,
  dailyMaxLoss: null,
  maxLossPerTrade: null,
  riskPerTradePct: 1,
  maxOpenPositions: 3,
  maxTotalExposure: null,
  maxTradesPerDay: 20,
  stopAfterDailyLoss: true,
  stopAfterDailyTarget: false,
  defaultStopLossPct: null,
  defaultTakeProfitPct: null,
  minRiskReward: 1.5,
  trailingStopEnabled: false,
  trailingStopPct: null,
  autoPaperExecution: false,
});

function dbPayload(input: TradingRiskControls) {
  return {
    mode: input.mode,
    daily_profit_target: input.dailyProfitTarget,
    daily_max_loss: input.dailyMaxLoss,
    max_loss_per_trade: input.maxLossPerTrade,
    risk_per_trade_pct: input.riskPerTradePct,
    max_open_positions: input.maxOpenPositions,
    max_total_exposure: input.maxTotalExposure,
    max_trades_per_day: input.maxTradesPerDay,
    stop_after_daily_loss: input.stopAfterDailyLoss,
    stop_after_daily_target: input.stopAfterDailyTarget,
    default_stop_loss_pct: input.defaultStopLossPct,
    default_take_profit_pct: input.defaultTakeProfitPct,
    min_risk_reward: input.minRiskReward,
    trailing_stop_enabled: input.trailingStopEnabled,
    trailing_stop_pct: input.trailingStopPct,
    auto_paper_execution:
      input.mode === "paper" ? input.autoPaperExecution : false,
    updated_at: new Date().toISOString(),
  };
}

export async function getRiskControls(mode: TradingMode) {
  const user = await currentUser();
  const row = (
    await select(
      "trading_risk_controls",
      `owner_id=eq.${user.id}&mode=eq.${mode}&limit=1`,
    )
  )[0];

  if (row) return fromRow(row, mode);

  const value = defaults(mode);
  const created = await insert<Row>("trading_risk_controls", {
    owner_id: user.id,
    ...dbPayload(value),
  });
  return fromRow(created[0] ?? {}, mode);
}

export async function saveRiskControls(input: TradingRiskControls) {
  const user = await currentUser();
  const existing = (
    await select(
      "trading_risk_controls",
      `owner_id=eq.${user.id}&mode=eq.${input.mode}&limit=1`,
    )
  )[0];

  const payload = dbPayload(input);
  if (existing) {
    const rows = await update<Row>(
      "trading_risk_controls",
      `owner_id=eq.${user.id}&mode=eq.${input.mode}`,
      payload,
    );
    return fromRow(rows[0] ?? payload, input.mode);
  }

  const rows = await insert<Row>("trading_risk_controls", {
    owner_id: user.id,
    ...payload,
  });
  return fromRow(rows[0] ?? payload, input.mode);
}

export function enforceRiskControls(
  controls: TradingRiskControls,
  context: RiskContext,
): RiskDecision {
  if (
    controls.stopAfterDailyLoss &&
    controls.dailyMaxLoss != null &&
    context.dailyPnl <= -Math.abs(controls.dailyMaxLoss)
  ) {
    return { allowed: false, reason: "Daily maximum loss reached" };
  }

  if (
    controls.stopAfterDailyTarget &&
    controls.dailyProfitTarget != null &&
    context.dailyPnl >= controls.dailyProfitTarget
  ) {
    return { allowed: false, reason: "Daily profit target reached" };
  }

  if (context.openPositions >= controls.maxOpenPositions) {
    return { allowed: false, reason: "Maximum open positions reached" };
  }

  if (context.tradesToday >= controls.maxTradesPerDay) {
    return { allowed: false, reason: "Maximum trades per day reached" };
  }

  if (
    controls.maxTotalExposure != null &&
    context.totalExposure + (context.proposedExposure ?? 0) >
      controls.maxTotalExposure
  ) {
    return { allowed: false, reason: "Maximum total exposure would be exceeded" };
  }

  if (
    controls.maxLossPerTrade != null &&
    context.proposedMaxLoss != null &&
    context.proposedMaxLoss > controls.maxLossPerTrade
  ) {
    return { allowed: false, reason: "Maximum loss per trade would be exceeded" };
  }

  return { allowed: true };
}
