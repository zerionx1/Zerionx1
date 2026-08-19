"use client";

import { useEffect, useMemo, useState } from "react";

export type LiveTicker = {
  symbol: string;
  price: number;
  changePercent: number;
  timestamp: number;
};

function displaySymbol(symbol: string) {
  const value = symbol.trim().toUpperCase();
  if (value.includes("/")) return value;
  return value.endsWith("USDT")
    ? `${value.slice(0, -4)}/USDT`
    : value;
}

/**
 * Legacy export name retained so existing components do not break.
 * It no longer connects to Binance. All crypto frames now come through
 * Zerion's Render realtime gateway, whose upstream provider is CoinDCX.
 */
export function useBinanceMarketStream(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, LiveTicker>>({});
  const wanted = useMemo(
    () => new Set(symbols.map(displaySymbol)),
    [symbols],
  );

  useEffect(() => {
    if (wanted.size === 0) return;

    const configured =
      process.env.NEXT_PUBLIC_ZERION_REALTIME_URL ??
      "wss://zerionx1.onrender.com/realtime";
    const socket = new WebSocket(configured);

    const ingest = (quote: {
      provider?: string;
      symbol?: string;
      price?: number;
      changePercent?: number;
      timestamp?: string;
    }) => {
      if (quote.provider !== "coindcx" || !quote.symbol) return;
      const symbol = displaySymbol(quote.symbol);
      if (!wanted.has(symbol) || typeof quote.price !== "number") return;

      setQuotes((current) => ({
        ...current,
        [symbol]: {
          symbol,
          price: quote.price!,
          changePercent: Number(quote.changePercent ?? 0),
          timestamp: Date.parse(quote.timestamp ?? "") || Date.now(),
        },
      }));
    };

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const envelope = JSON.parse(event.data) as {
          type?: string;
          data?: unknown;
        };
        if (envelope.type === "snapshot" && Array.isArray(envelope.data)) {
          for (const row of envelope.data) ingest(row as Parameters<typeof ingest>[0]);
          return;
        }
        if (envelope.type === "quote") {
          ingest(envelope.data as Parameters<typeof ingest>[0]);
        }
      } catch {
        // Ignore malformed frames; the gateway connection stays open.
      }
    };

    socket.addEventListener("message", onMessage);
    return () => {
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
  }, [wanted]);

  return quotes;
}
