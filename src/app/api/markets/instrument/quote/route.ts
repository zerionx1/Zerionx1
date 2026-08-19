import { NextRequest } from "next/server";

import { getCoinDcxTicker } from "@/lib/brokers/coindcx-core";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { fail, ok } from "@/lib/security/api-response";

function firstObject(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const entries = Object.values(value as Record<string, unknown>);
  return entries.find((row) => row && typeof row === "object") as
    | Record<string, unknown>
    | undefined;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";

  try {
    if (id.startsWith("upstox:")) {
      const instrumentKey = id.slice("upstox:".length);
      const response = (await upstoxClient.fullQuote(instrumentKey)) as {
        data?: Record<string, unknown>;
      };
      const row = firstObject(response.data);
      if (!row) return fail("QUOTE_NOT_FOUND", "Upstox quote unavailable", 404);

      const price = Number(row.last_price ?? 0);
      const ohlc = (row.ohlc ?? {}) as Record<string, unknown>;
      const previousClose = Number(ohlc.close ?? price);
      const change = price - previousClose;

      return ok({
        provider: "upstox",
        instrumentId: id,
        symbol,
        price,
        change,
        changePercent: previousClose ? (change / previousClose) * 100 : 0,
        open: Number(ohlc.open ?? price),
        high: Number(ohlc.high ?? price),
        low: Number(ohlc.low ?? price),
        previousClose,
        volume: Number(row.volume ?? 0),
        timestamp: new Date(Number(row.last_trade_time ?? Date.now())).toISOString(),
      });
    }

    if (id.startsWith("coindcx:")) {
      const rows = await getCoinDcxTicker();
      const compact = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const row = rows.find(
        (item) =>
          String(item.market ?? "").toUpperCase() === compact ||
          String(item.market ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "") === compact,
      );
      if (!row) return fail("QUOTE_NOT_FOUND", "CoinDCX quote unavailable", 404);

      const price = Number(row.last_price ?? 0);
      const changePercent = Number(row.change_24_hour ?? 0);
      const previousClose =
        changePercent === -100 ? price : price / (1 + changePercent / 100);

      return ok({
        provider: "coindcx",
        instrumentId: id,
        symbol,
        price,
        change: price - previousClose,
        changePercent,
        open: previousClose,
        high: Number(row.high ?? price),
        low: Number(row.low ?? price),
        previousClose,
        volume: Number(row.volume ?? 0),
        timestamp: new Date(Number(row.timestamp ?? Date.now())).toISOString(),
      });
    }

    return fail("PROVIDER_ID_REQUIRED", "Open an instrument returned by provider search.", 400);
  } catch (error) {
    return fail(
      "QUOTE_PROVIDER_ERROR",
      error instanceof Error ? error.message : "Quote provider failed",
      502,
    );
  }
}
