import { upstoxClient } from "@/lib/brokers/upstox-client";
import { upstoxInstrumentKeyFor } from "@/lib/market-data/providers/upstox/feed-normalizer";
import { fail, ok } from "@/lib/security/api-response";
import type { Candle } from "@/types/market";

function timeframe(value: string | null) {
  switch (value) {
    case "1m":
      return { unit: "minutes" as const, interval: 1 };
    case "3m":
      return { unit: "minutes" as const, interval: 3 };
    case "5m":
      return { unit: "minutes" as const, interval: 5 };
    case "15m":
      return { unit: "minutes" as const, interval: 15 };
    case "30m":
      return { unit: "minutes" as const, interval: 30 };
    case "1h":
      return { unit: "hours" as const, interval: 1 };
    case "4h":
      return { unit: "hours" as const, interval: 4 };
    case "1d":
      return { unit: "days" as const, interval: 1 };
    case "1w":
      return { unit: "weeks" as const, interval: 1 };
    default:
      return { unit: "minutes" as const, interval: 15 };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ instrumentId: string }> },
) {
  const { instrumentId } = await params;
  const url = new URL(request.url);
  const requestedSymbol = decodeURIComponent(instrumentId)
    .replace(/^nse:/i, "")
    .replace(/^upstox:/i, "");
  const instrumentKey =
    requestedSymbol.includes("|")
      ? requestedSymbol
      : upstoxInstrumentKeyFor(requestedSymbol);

  if (!instrumentKey) {
    return fail(
      "INSTRUMENT_NOT_MAPPED",
      "Select a concrete Upstox instrument/contract before requesting candles.",
      404,
    );
  }

  const tf = timeframe(url.searchParams.get("timeframe"));

  try {
    const payload = (await upstoxClient.intradayV3(
      instrumentKey,
      tf.unit === "weeks" ? "days" : tf.unit,
      tf.unit === "weeks" ? 1 : tf.interval,
    )) as {
      data?: { candles?: unknown[][] };
    };

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

    return ok({ instrumentId, instrumentKey, candles });
  } catch (error) {
    return fail(
      "CANDLE_PROVIDER_ERROR",
      error instanceof Error ? error.message : "Unable to load Upstox candles",
      502,
    );
  }
}
