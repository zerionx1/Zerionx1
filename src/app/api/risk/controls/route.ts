import { fail, ok } from "@/lib/security/api-response";
import {
  getRiskControls,
  saveRiskControls,
} from "@/lib/risk/trading-risk-controls";
import type { TradingMode, TradingRiskControls } from "@/types/risk-controls";

function modeOf(value: string | null): TradingMode {
  return value === "live" ? "live" : "paper";
}

function optionalNumber(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET(request: Request) {
  const mode = modeOf(new URL(request.url).searchParams.get("mode"));
  return ok(await getRiskControls(mode));
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<TradingRiskControls>
    | null;
  if (!body || (body.mode !== "paper" && body.mode !== "live")) {
    return fail("VALIDATION_ERROR", "Valid paper/live risk controls are required", 400);
  }

  const input: TradingRiskControls = {
    mode: body.mode,
    dailyProfitTarget: optionalNumber(body.dailyProfitTarget),
    dailyMaxLoss: optionalNumber(body.dailyMaxLoss),
    maxLossPerTrade: optionalNumber(body.maxLossPerTrade),
    riskPerTradePct: Number(body.riskPerTradePct ?? 1),
    maxOpenPositions: Math.floor(Number(body.maxOpenPositions ?? 3)),
    maxTotalExposure: optionalNumber(body.maxTotalExposure),
    maxTradesPerDay: Math.floor(Number(body.maxTradesPerDay ?? 20)),
    stopAfterDailyLoss: body.stopAfterDailyLoss !== false,
    stopAfterDailyTarget: body.stopAfterDailyTarget === true,
    defaultStopLossPct: optionalNumber(body.defaultStopLossPct),
    defaultTakeProfitPct: optionalNumber(body.defaultTakeProfitPct),
    minRiskReward: Number(body.minRiskReward ?? 1.5),
    trailingStopEnabled: body.trailingStopEnabled === true,
    trailingStopPct: optionalNumber(body.trailingStopPct),
    autoPaperExecution: body.mode === "paper" && body.autoPaperExecution === true,
  };

  if (
    input.riskPerTradePct <= 0 ||
    input.riskPerTradePct > 100 ||
    input.maxOpenPositions < 1 ||
    input.maxTradesPerDay < 1 ||
    input.minRiskReward <= 0
  ) {
    return fail("VALIDATION_ERROR", "Risk-control values are outside allowed ranges", 400);
  }

  return ok(await saveRiskControls(input));
}
