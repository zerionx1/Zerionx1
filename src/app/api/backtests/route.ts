import { NextRequest } from "next/server";
import { consumeQuota } from "@/lib/billing/quotas";
import { apiError, apiSuccess } from "@/lib/security/api-response";
import { backtestRequestSchema } from "@/lib/validation/backtest";
import {
  listUserBacktests,
  saveUserBacktest,
} from "@/lib/backtest/backtest-repository";
import { runEducationalBacktest } from "@/lib/backtest/simulator";
import { getLiveCandles } from "@/lib/market/live-candles";

export async function GET() {
  return apiSuccess({ backtests: await listUserBacktests() });
}

export async function POST(req: NextRequest) {
  const parsed = backtestRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid backtest request",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const request = { ...parsed.data, id: crypto.randomUUID() };
    const candles = await getLiveCandles(
      request.symbol,
      request.timeframe,
      5000,
      request.startDate,
      request.endDate,
    );

    if (candles.length < 50) {
      return apiError(
        "INSUFFICIENT_PROVIDER_DATA",
        `Provider returned ${candles.length} candles; at least 50 real candles are required`,
        422,
      );
    }

    await consumeQuota("backtest", 1);
    const result = runEducationalBacktest(request, candles);
    return apiSuccess({ result: await saveUserBacktest(result) }, 201);
  } catch (error) {
    return apiError(
      "MARKET_DATA_UNAVAILABLE",
      error instanceof Error
        ? error.message
        : "Provider-backed historical market data unavailable",
      503,
    );
  }
}
