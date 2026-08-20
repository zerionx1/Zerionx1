import "server-only";

import { getCoinDcxCandles } from "@/lib/brokers/coindcx-core";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { coinDcxPairFor } from "@/lib/market-data/providers/coindcx/feed-normalizer";
import { upstoxInstrumentKeyFor } from "@/lib/market-data/providers/upstox/feed-normalizer";
import type { Candle, Timeframe } from "@/types/market";

function upstoxFrame(timeframe: Timeframe) {
  switch (timeframe) {
    case "1m": return { unit: "minutes" as const, interval: 1 };
    case "3m": return { unit: "minutes" as const, interval: 3 };
    case "5m": return { unit: "minutes" as const, interval: 5 };
    case "15m": return { unit: "minutes" as const, interval: 15 };
    case "30m": return { unit: "minutes" as const, interval: 30 };
    case "1h": return { unit: "hours" as const, interval: 1 };
    case "4h": return { unit: "hours" as const, interval: 4 };
    case "1d": return { unit: "days" as const, interval: 1 };
    case "1w": return { unit: "weeks" as const, interval: 1 };
  }
}

function coinDcxFrame(timeframe: Timeframe) {
  if (timeframe === "3m") return "5m";
  return timeframe;
}

function cleanIndianSymbol(symbol: string) {
  return symbol
    .replace(/^upstox:/i, "")
    .replace(/^nse:/i, "")
    .trim();
}

export async function getProviderHistoricalCandles(input: {
  symbol: string;
  timeframe: Timeframe;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Candle[]> {
  const { symbol, timeframe } = input;
  const limit = Math.max(50, Math.min(input.limit ?? 1000, 5000));
  const pair = coinDcxPairFor(
    symbol.replace(/^coindcx:/i, "").replace(/^crypto:/i, ""),
  );

  if (pair) {
    const rows = await getCoinDcxCandles(pair, coinDcxFrame(timeframe), limit);
    const candles = rows
      .map((row) => ({
        time: new Date(Number(row.time)).toISOString(),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
      .filter(
        (row) =>
          Number.isFinite(row.open) &&
          Number.isFinite(row.high) &&
          Number.isFinite(row.low) &&
          Number.isFinite(row.close),
      )
      .reverse();

    if (timeframe !== "3m") return candles;

    // CoinDCX does not expose 3m directly in the existing provider contract.
    // Do not fabricate prices: aggregate real 5m candles is semantically wrong,
    // so fail clearly instead.
    throw new Error("CoinDCX historical 3m candles are not available from the configured provider");
  }

  const raw = cleanIndianSymbol(symbol);
  const instrumentKey = raw.includes("|") ? raw : upstoxInstrumentKeyFor(raw);
  if (!instrumentKey) {
    throw new Error(`No Upstox provider instrument resolved for ${symbol}`);
  }

  const frame = upstoxFrame(timeframe);
  const endDate = input.endDate ?? new Date().toISOString().slice(0, 10);
  const startDate = input.startDate;

  const payload = (await upstoxClient.historicalV3(
    instrumentKey,
    frame.unit,
    frame.interval,
    endDate,
    startDate,
  )) as { data?: { candles?: unknown[][] } };

  return (payload.data?.candles ?? [])
    .map((row) => ({
      time: String(row[0] ?? ""),
      open: Number(row[1] ?? 0),
      high: Number(row[2] ?? 0),
      low: Number(row[3] ?? 0),
      close: Number(row[4] ?? 0),
      volume: Number(row[5] ?? 0),
    }))
    .filter(
      (row) =>
        Boolean(row.time) &&
        Number.isFinite(row.open) &&
        Number.isFinite(row.high) &&
        Number.isFinite(row.low) &&
        Number.isFinite(row.close),
    )
    .reverse()
    .slice(-limit);
}
