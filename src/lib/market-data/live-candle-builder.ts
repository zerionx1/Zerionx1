import type { Candle, Timeframe } from "@/types/market";
import type { ZerionLiveQuote } from "@/hooks/use-zerion-market-stream";

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
};

function toMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function candleBucket(timestamp: string, timeframe: Timeframe) {
  const size = TIMEFRAME_MS[timeframe];
  return Math.floor(toMs(timestamp) / size) * size;
}

export function mergeLiveQuoteIntoCandles(
  candles: Candle[],
  quote: ZerionLiveQuote,
  timeframe: Timeframe,
  limit = 1000,
): Candle[] {
  if (!Number.isFinite(quote.price) || quote.price <= 0) return candles;

  const bucket = candleBucket(quote.timestamp, timeframe);
  const time = new Date(bucket).toISOString();

  if (!candles.length) {
    return [{
      time,
      open: quote.price,
      high: quote.price,
      low: quote.price,
      close: quote.price,
      volume: quote.volume,
    }];
  }

  const next = candles.map((c) => ({ ...c }));
  const last = next[next.length - 1]!;
  const lastBucket = candleBucket(last.time, timeframe);

  if (bucket < lastBucket) return candles;

  if (bucket === lastBucket) {
    last.high = Math.max(last.high, quote.price);
    last.low = Math.min(last.low, quote.price);
    last.close = quote.price;
    if (typeof quote.volume === "number") last.volume = quote.volume;
    return next;
  }

  // Never manufacture gap candles: only a real provider tick starts a candle.
  next.push({
    time,
    open: quote.price,
    high: quote.price,
    low: quote.price,
    close: quote.price,
    volume: quote.volume,
  });

  return next.length > limit ? next.slice(-limit) : next;
}
