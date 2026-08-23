"use client";

import type { Candle, MarketInstrument, Timeframe } from "@/types/market";
import {
  subscribeZerionRealtime,
  type ZerionLiveQuote,
} from "@/hooks/use-zerion-market-stream";
import { mergeLiveQuoteIntoCandles } from "@/lib/market-data/live-candle-builder";

export type GoChartingBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type ZerionChartSymbol = {
  id: string;
  symbol: string;
  displayName: string;
  exchange: string;
  market: string;
};

export type RealtimeBarListener = (bar: GoChartingBar) => void;

function toBar(candle: Candle): GoChartingBar {
  return {
    time: Date.parse(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

function normalizeInstrument(item: MarketInstrument): ZerionChartSymbol {
  return {
    id: item.id,
    symbol: item.symbol,
    displayName: item.displayName,
    exchange: item.exchange,
    market: item.market,
  };
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = body as { error?: { message?: string }; message?: string };
    throw new Error(
      err.error?.message ?? err.message ?? `Chart data request failed (${response.status})`,
    );
  }
  return body as T;
}

export class ZerionGoChartingDatafeed {
  async searchSymbols(query: string, signal?: AbortSignal) {
    const body = await getJson<{ data?: MarketInstrument[] }>(
      `/api/markets/search?q=${encodeURIComponent(query)}`,
      signal,
    );
    return (body.data ?? []).map(normalizeInstrument);
  }

  async resolveSymbol(
    input: Pick<ZerionChartSymbol, "id" | "symbol"> | string,
    signal?: AbortSignal,
  ): Promise<ZerionChartSymbol> {
    const id = typeof input === "string" ? "" : input.id;
    const symbol = typeof input === "string" ? input : input.symbol;
    const rows = await this.searchSymbols(symbol || id, signal);
    const clean = (value: string) =>
      value.trim().toUpperCase().replaceAll("/", "").replaceAll("-", "");

    const hit =
      rows.find((row) => id && row.id === id) ??
      rows.find((row) => clean(row.symbol) === clean(symbol));

    if (!hit) throw new Error(`Instrument not found: ${symbol || id}`);
    return hit;
  }

  async getBars(
    instrument: ZerionChartSymbol,
    timeframe: Timeframe,
    limit = 500,
    signal?: AbortSignal,
  ): Promise<GoChartingBar[]> {
    const safeLimit = Math.max(50, Math.min(2000, Math.floor(limit)));
    const body = await getJson<{ data?: Candle[] }>(
      `/api/market/candles?instrument=${encodeURIComponent(
        instrument.id,
      )}&timeframe=${encodeURIComponent(timeframe)}&limit=${safeLimit}`,
      signal,
    );

    return (body.data ?? [])
      .filter(
        (bar) =>
          Number.isFinite(bar.open) &&
          Number.isFinite(bar.high) &&
          Number.isFinite(bar.low) &&
          Number.isFinite(bar.close),
      )
      .map(toBar);
  }

  subscribeBars(
    instrument: ZerionChartSymbol,
    timeframe: Timeframe,
    initialBars: GoChartingBar[],
    listener: RealtimeBarListener,
  ) {
    let candles: Candle[] = initialBars.map((bar) => ({
      time: new Date(bar.time).toISOString(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));

    return subscribeZerionRealtime(
      [instrument.id, instrument.symbol],
      (quote: ZerionLiveQuote | null) => {
        if (!quote) return;
        candles = mergeLiveQuoteIntoCandles(candles, quote, timeframe, 2000);
        const current = candles.at(-1);
        if (current) listener(toBar(current));
      },
    );
  }
}

export const zerionGoChartingDatafeed = new ZerionGoChartingDatafeed();
