import type { Candle, Timeframe } from "@/types/market";

export async function getLiveCandles(
  symbol: string,
  timeframe: Timeframe,
  limit = 500,
): Promise<Candle[]> {
  const base = process.env.ZERION_MARKET_DATA_BASE_URL;
  const key = process.env.ZERION_MARKET_DATA_API_KEY;

  if (!base) {
    throw new Error(
      `No Zerion market-data provider configured for ${symbol}. ` +
        `Set ZERION_MARKET_DATA_BASE_URL.`,
    );
  }

  const response = await fetch(
    `${base.replace(/\/$/, "")}/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`,
    {
      headers: key
        ? {
            Authorization: `Bearer ${key}`,
          }
        : {},
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Zerion candle provider failed for ${symbol}: HTTP ${response.status}`,
    );
  }

  const body = await response.json();

  if (Array.isArray(body)) {
    return body as Candle[];
  }

  if (Array.isArray(body?.candles)) {
    return body.candles as Candle[];
  }

  if (Array.isArray(body?.data?.candles)) {
    return body.data.candles as Candle[];
  }

  throw new Error(`Invalid Zerion candle response for ${symbol}`);
}
