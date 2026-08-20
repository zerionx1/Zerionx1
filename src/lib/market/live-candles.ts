import type { Candle, Timeframe } from "@/types/market";
import { getProviderHistoricalCandles } from "@/lib/market/provider-historical-candles";

export async function getLiveCandles(
  symbol: string,
  timeframe: Timeframe,
  limit = 500,
  startDate?: string,
  endDate?: string,
): Promise<Candle[]> {
  return getProviderHistoricalCandles({
    symbol,
    timeframe,
    limit,
    startDate,
    endDate,
  });
}
