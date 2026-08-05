import type { Candle } from "@/types/market";
import type { BacktestRequest, BacktestResult, BacktestTrade, EquityPoint } from "@/types/backtest";
import { calculateBacktestMetrics } from "@/lib/backtest/metrics";
export function runEducationalBacktest(
  request: BacktestRequest,
  candles: Candle[],
): BacktestResult {
  let equity = request.assumptions.initialCapital;
  let peak = equity;

  const trades: BacktestTrade[] = [];
  const curve: EquityPoint[] = [];

  for (let index = 20; index < candles.length - 5; index += 12) {
    const entry = candles[index];
    const exit = candles[Math.min(index + 5, candles.length - 1)];

    if (!entry || !exit || entry.close <= 0 || exit.close <= 0) {
      continue;
    }

    const quantity = Math.max(
      1,
      Math.floor((equity * 0.1) / entry.close),
    );

    const gross = (exit.close - entry.close) * quantity;

    const tradedValue = (entry.close + exit.close) * quantity;

    const fees =
      tradedValue * (request.assumptions.commissionBps / 10_000);

    const slippage =
      tradedValue * (request.assumptions.slippageBps / 10_000);

    const pnl = gross - fees - slippage;

    equity += pnl;
    peak = Math.max(peak, equity);

    trades.push({
      id: `bt_${request.id}_${index}`,
      side: "long",
      entryTime: entry.time,
      exitTime: exit.time,
      entryPrice: entry.close,
      exitPrice: exit.close,
      quantity,
      fees: fees + slippage,
      pnl,
      pnlPct:
        entry.close * quantity > 0
          ? (100 * pnl) / (entry.close * quantity)
          : 0,
      exitReason: "educational time exit",
    });

    curve.push({
      time: exit.time,
      equity,
      drawdown: peak - equity,
    });
  }

  const completedAt = new Date().toISOString();

  return {
    id: `result_${request.id}`,
    request,
    status: "completed",
    metrics: calculateBacktestMetrics(
      trades,
      curve,
      request.assumptions.initialCapital,
    ),
    trades,
    equityCurve: curve,
    warnings: [
      "Educational deterministic simulator; not proof of future performance.",
      "Historical liquidity and market impact are approximated.",
    ],
    startedAt: completedAt,
    completedAt,
  };
}
