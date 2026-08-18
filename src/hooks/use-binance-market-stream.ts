"use client";

import { useEffect, useMemo, useState } from "react";

export type LiveTicker = {
  symbol: string;
  price: number;
  changePercent: number;
  timestamp: number;
};

function pair(symbol: string) {
  return symbol.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

export function useBinanceMarketStream(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, LiveTicker>>({});
  const normalized = useMemo(
    () =>
      Array.from(
        new Set(
          symbols
            .filter((symbol) => pair(symbol).endsWith("usdt"))
            .map((symbol) => pair(symbol)),
        ),
      ).sort(),
    [symbols],
  );

  useEffect(() => {
    if (normalized.length === 0) return;

    const streams = normalized.map((symbol) => `${symbol}@ticker`).join("/");
    const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const envelope = JSON.parse(event.data) as {
          data?: { s?: string; c?: string; P?: string; E?: number };
        };
        const data = envelope.data;
        if (!data?.s || !data.c) return;

        const display = data.s.endsWith("USDT")
          ? `${data.s.slice(0, -4)}/USDT`
          : data.s;

        setQuotes((current) => ({
          ...current,
          [display]: {
            symbol: display,
            price: Number(data.c),
            changePercent: Number(data.P ?? 0),
            timestamp: Number(data.E ?? Date.now()),
          },
        }));
      } catch {
        // Ignore malformed market frames. The socket will continue.
      }
    };

    socket.addEventListener("message", onMessage);
    return () => {
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
  }, [normalized]);

  return quotes;
}
