"use client";

import { useEffect, useMemo, useState } from "react";

export type ZerionFeedStatus =
  | "LIVE"
  | "RECONNECTING"
  | "STALE"
  | "DISCONNECTED";

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

type Listener = () => void;

function norm(value: string) {
  return value.trim().toUpperCase();
}

function quoteAliases(quote: ZerionLiveQuote) {
  return [
    norm(quote.instrumentId),
    norm(quote.symbol),
    norm(quote.providerSymbol),
    norm(quote.symbol).replaceAll("/", ""),
    norm(quote.symbol).replaceAll("-", ""),
  ];
}

class ZerionRealtimeGateway {
  socket: WebSocket | null = null;
  refs = new Map<string, number>();
  quotes = new Map<string, ZerionLiveQuote>();
  listeners = new Set<Listener>();
  reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  staleTimer: ReturnType<typeof setInterval> | null = null;
  reconnectAttempt = 0;
  status: ZerionFeedStatus = "DISCONNECTED";
  lastQuoteAt = 0;

  private url() {
    return (
      process.env.NEXT_PUBLIC_ZERION_REALTIME_URL ??
      "wss://zerionx1.onrender.com/realtime"
    );
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private setStatus(status: ZerionFeedStatus) {
    if (status === this.status) return;
    this.status = status;
    this.emit();
  }

  private startStaleWatch() {
    if (this.staleTimer) return;
    this.staleTimer = setInterval(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) return;
      if (!this.lastQuoteAt) return;
      if (Date.now() - this.lastQuoteAt > 15_000) this.setStatus("STALE");
    }, 2500);
  }

  private ingest(value: unknown) {
    if (!value || typeof value !== "object") return;
    const quote = value as ZerionLiveQuote;
    if (
      (quote.provider !== "upstox" && quote.provider !== "coindcx") ||
      !quote.instrumentId ||
      !quote.symbol ||
      !Number.isFinite(quote.price)
    ) return;

    for (const alias of quoteAliases(quote)) this.quotes.set(alias, quote);
    this.lastQuoteAt = Date.now();
    this.setStatus("LIVE");
    this.emit();
  }

  connect() {
    if (typeof window === "undefined") return;
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) return;

    this.setStatus(this.reconnectAttempt ? "RECONNECTING" : "DISCONNECTED");
    const socket = new WebSocket(this.url());
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.startStaleWatch();
      const instruments = [...this.refs.keys()];
      if (instruments.length) {
        socket.send(JSON.stringify({ type: "subscribe", instruments }));
      }
    });

    socket.addEventListener("message", (event) => {
      try {
        const frame = JSON.parse(event.data) as GatewayEnvelope;
        if (frame.type === "snapshot" && Array.isArray(frame.data)) {
          for (const item of frame.data) this.ingest(item);
          return;
        }
        if (frame.type === "quote") this.ingest(frame.data);
      } catch {
        // Malformed gateway frames are ignored; provider prices are never synthesized.
      }
    });

    socket.addEventListener("error", () => socket.close());
    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      if (!this.refs.size) {
        this.setStatus("DISCONNECTED");
        return;
      }
      this.setStatus("RECONNECTING");
      const delay = Math.min(15_000, 1000 * 2 ** Math.min(4, this.reconnectAttempt++));
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    });
  }

  subscribe(instruments: string[], listener: Listener) {
    this.listeners.add(listener);
    const wanted = [...new Set(instruments.map(norm).filter(Boolean))];
    const newlyAdded: string[] = [];

    for (const id of wanted) {
      const count = this.refs.get(id) ?? 0;
      this.refs.set(id, count + 1);
      if (count === 0) newlyAdded.push(id);
    }

    this.connect();

    if (newlyAdded.length && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "subscribe", instruments: newlyAdded }));
    }

    return () => {
      this.listeners.delete(listener);
      const removed: string[] = [];
      for (const id of wanted) {
        const count = this.refs.get(id) ?? 0;
        if (count <= 1) {
          this.refs.delete(id);
          removed.push(id);
        } else this.refs.set(id, count - 1);
      }

      if (removed.length && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "unsubscribe", instruments: removed }));
      }

      if (!this.refs.size) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.socket?.close();
        this.socket = null;
        this.setStatus("DISCONNECTED");
      }
    };
  }

  snapshot(wanted: Set<string>) {
    const out: Record<string, ZerionLiveQuote> = {};
    for (const id of wanted) {
      const quote = this.quotes.get(id);
      if (quote) out[id] = quote;
    }
    return { quotes: out, status: this.status, lastQuoteAt: this.lastQuoteAt };
  }
}

const gateway = new ZerionRealtimeGateway();

export function useZerionMarketStream(instruments: string[]) {
  const key = instruments.map(norm).filter(Boolean).sort().join("|");
  const wanted = useMemo(() => new Set(key ? key.split("|") : []), [key]);
  const [, render] = useState(0);

  useEffect(() => {
    if (!wanted.size) return;
    return gateway.subscribe([...wanted], () => render((v) => v + 1));
  }, [wanted]);

  return gateway.snapshot(wanted).quotes;
}

export function useZerionFeedStatus() {
  const [, render] = useState(0);
  useEffect(() => {
    const listener = () => render((v) => v + 1);
    gateway.listeners.add(listener);
    return () => {
      gateway.listeners.delete(listener);
    };
  }, []);
  return {
    status: gateway.status,
    lastQuoteAt: gateway.lastQuoteAt,
  };
}
