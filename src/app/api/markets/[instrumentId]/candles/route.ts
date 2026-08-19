import { upstoxClient } from "@/lib/brokers/upstox-client";
import { getCoinDcxCandles } from "@/lib/brokers/coindcx-core";
import { coinDcxPairFor } from "@/lib/market-data/providers/coindcx/feed-normalizer";
import { upstoxInstrumentKeyFor } from "@/lib/market-data/providers/upstox/feed-normalizer";
import { fail, ok } from "@/lib/security/api-response";
import type { Candle } from "@/types/market";

function upstoxTimeframe(value: string | null) {
  switch (value) {
    case "1m": return { unit: "minutes" as const, interval: 1 };
    case "3m": return { unit: "minutes" as const, interval: 3 };
    case "5m": return { unit: "minutes" as const, interval: 5 };
    case "15m": return { unit: "minutes" as const, interval: 15 };
    case "30m": return { unit: "minutes" as const, interval: 30 };
    case "1h": return { unit: "hours" as const, interval: 1 };
    case "4h": return { unit: "hours" as const, interval: 4 };
    case "1d": return { unit: "days" as const, interval: 1 };
    default: return { unit: "minutes" as const, interval: 15 };
  }
}

function coinDcxTimeframe(value: string | null) {
  const supported = new Set([
    "1m", "5m", "15m", "30m", "1h", "2h", "4h",
    "6h", "8h", "1d", "3d", "1w", "1M",
  ]);
  return supported.has(value ?? "") ? String(value) : "15m";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ instrumentId: string }> },
) {
  const { instrumentId } = await params;
  const url = new URL(request.url);
  const decoded = decodeURIComponent(instrumentId);
  const cryptoSymbol = decoded
    .replace(/^coindcx:/i, "")
    .replace(/^crypto:/i, "");
  const coinDcxPair = coinDcxPairFor(cryptoSymbol);

  if (coinDcxPair) {
    try {
      const rows = await getCoinDcxCandles(
        coinDcxPair,
        coinDcxTimeframe(url.searchParams.get("timeframe")),
        500,
      );

      const candles: Candle[] = rows
        .map((row) => ({
          time: new Date(Number(row.time)).toISOString(),
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume),
        }))
        .reverse();

      return ok({
        instrumentId,
        provider: "coindcx",
        pair: coinDcxPair,
        candles,
      });
    } catch (error) {
      return fail(
        "CANDLE_PROVIDER_ERROR",
        error instanceof Error ? error.message : "Unable to load CoinDCX candles",
        502,
      );
    }
  }

  const requestedSymbol = decoded
    .replace(/^nse:/i, "")
    .replace(/^upstox:/i, "");
  const instrumentKey =
    requestedSymbol.includes("|")
      ? requestedSymbol
      : upstoxInstrumentKeyFor(requestedSymbol);

  if (!instrumentKey) {
    return fail(
      "INSTRUMENT_NOT_MAPPED",
      "Select a concrete provider instrument before requesting candles.",
      404,
    );
  }

  const tf = upstoxTimeframe(url.searchParams.get("timeframe"));

  try {
    const payload = (await upstoxClient.intradayV3(
      instrumentKey,
      tf.unit,
      tf.interval,
    )) as { data?: { candles?: unknown[][] } };

    const candles: Candle[] = (payload.data?.candles ?? [])
      .map((row) => ({
        time: String(row[0] ?? ""),
        open: Number(row[1] ?? 0),
        high: Number(row[2] ?? 0),
        low: Number(row[3] ?? 0),
        close: Number(row[4] ?? 0),
        volume: Number(row[5] ?? 0),
      }))
      .reverse();

    return ok({ instrumentId, provider: "upstox", instrumentKey, candles });
  } catch (error) {
    return fail(
      "CANDLE_PROVIDER_ERROR",
      error instanceof Error ? error.message : "Unable to load Upstox candles",
      502,
    );
  }
}
