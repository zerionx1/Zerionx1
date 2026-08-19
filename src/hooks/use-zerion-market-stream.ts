"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ZerionLiveQuote = {
  provider: "upstox" | "coindcx";
  symbol: string;
  providerSymbol: string;
  instrumentId: string;
  timestamp: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume?: number;
  bid?: number;
  ask?: number;
  delayed?: boolean;
};

type GatewayEnvelope = {
  type?: string;
  data?: unknown;
};

function normalize(value: string) {
  return value.trim().toUpperCase();
}

function aliases(quote: ZerionLiveQuote) {
  return new Set([
    normalize(quote.instrumentId),
    normalize(quote.symbol),
    normalize(quote.providerSymbol),
    normalize(quote.symbol).replace("/", ""),
    normalize(quote.symbol).replace("-", ""),
  ]);
}

export function useZerionMarketStream(
  instruments: string[],
): Record<string, ZerionLiveQuote> {
  const [quotes, setQuotes] = useState<Record<string, ZerionLiveQuote>>({});
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wanted = useMemo(
    () => new Set(instruments.map(normalize).filter(Boolean)),
    [instruments],
  );

  useEffect(() => {
    if (wanted.size === 0) return;

    let socket: WebSocket | null = null;
    let stopped = false;

    const ingest = (value: unknown) => {
      if (!value || typeof value !== "object") return;

      const quote = value as ZerionLiveQuote;

      if (
        (quote.provider !== "upstox" && quote.provider !== "coindcx") ||
        !quote.instrumentId ||
        !quote.symbol ||
        typeof quote.price !== "number"
      ) {
        return;
      }

      const quoteAliases = aliases(quote);
      const matched = [...wanted].some((item) => quoteAliases.has(item));

      if (!matched) return;

      setQuotes((current) => {
        const next = { ...current };

        for (const item of wanted) {
          if (quoteAliases.has(item)) next[item] = quote;
        }

        next[normalize(quote.instrumentId)] = quote;
        next[normalize(quote.symbol)] = quote;
        next[normalize(quote.providerSymbol)] = quote;

        return next;
      });
    };

    const connect = () => {
      if (stopped) return;

      const configured =
        process.env.NEXT_PUBLIC_ZERION_REALTIME_URL ??
        "wss://zerionx1.onrender.com/realtime";

      socket = new WebSocket(configured);

      socket.addEventListener("open", () => {
        socket?.send(
          JSON.stringify({
            type: "subscribe",
            instruments: [...wanted],
          }),
        );
      });

      socket.addEventListener("message", (event) => {
        try {
          const envelope = JSON.parse(event.data) as GatewayEnvelope;

          if (envelope.type === "snapshot" && Array.isArray(envelope.data)) {
            for (const row of envelope.data) ingest(row);
            return;
          }

          if (envelope.type === "quote") {
            ingest(envelope.data);
          }
        } catch {
          // Ignore malformed frames.
        }
      });

      socket.addEventListener("close", () => {
        if (stopped) return;

        reconnectTimer.current = setTimeout(connect, 3000);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    };

    connect();

    return () => {
      stopped = true;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "unsubscribe",
            instruments: [...wanted],
          }),
        );
      }

      socket?.close();
    };
  }, [wanted]);

  return quotes;
}
