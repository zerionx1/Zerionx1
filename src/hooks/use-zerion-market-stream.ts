"use client";

import { useEffect, useMemo, useState } from "react";

export type ZerionFeedStatus = "LIVE" | "RECONNECTING" | "STALE" | "DISCONNECTED";
export type ZerionLiveQuote = {
  provider: "upstox" | "coindcx" | "forex";
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

type GatewayEnvelope = { type?: string; data?: unknown };
type Listener = () => void;

const norm = (v: string) => v.trim().toUpperCase();
function aliases(q: ZerionLiveQuote) {
  return [
    norm(q.instrumentId),
    norm(q.symbol),
    norm(q.providerSymbol),
    norm(q.symbol).replaceAll("/", ""),
    norm(q.symbol).replaceAll("-", ""),
  ];
}
function delay(attempt: number) {
  const base = Math.min(20_000, 750 * 2 ** Math.min(5, attempt));
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

class Gateway {
  socket: WebSocket | null = null;
  refs = new Map<string, number>();
  quotes = new Map<string, ZerionLiveQuote>();
  listeners = new Set<Listener>();
  reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  healthTimer: ReturnType<typeof setInterval> | null = null;
  reconnectAttempt = 0;
  status: ZerionFeedStatus = "DISCONNECTED";
  lastQuoteAt = 0;
  lastGatewayMessageAt = 0;

  private url() {
    return process.env.NEXT_PUBLIC_ZERION_REALTIME_URL ?? "wss://zerionx1.onrender.com/realtime";
  }
  private emit() {
    for (const listener of this.listeners) listener();
  }
  private setStatus(value: ZerionFeedStatus) {
    if (value === this.status) return;
    this.status = value;
    this.emit();
  }
  private scheduleReconnect() {
    if (!this.refs.size || this.reconnectTimer) return;
    const wait = delay(this.reconnectAttempt++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, wait);
  }
  private startHealth() {
    if (this.healthTimer) return;
    this.healthTimer = setInterval(() => {
      if (!this.refs.size) return;
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.setStatus("RECONNECTING");
        this.scheduleReconnect();
        return;
      }
      const silence = this.lastGatewayMessageAt ? Date.now() - this.lastGatewayMessageAt : 0;
      if (silence > 300_000) {
        this.setStatus("STALE");
        // An open-but-silent socket is not useful. Force a clean reconnect instead
        // of leaving the UI stale indefinitely.
        try {
          const instruments = [...this.refs.keys()];
          if (instruments.length) this.socket.send(JSON.stringify({ type: "subscribe", instruments }));
          if (silence > 600_000) this.socket.close(4000, "prolonged-silence");
        } catch {
          this.socket = null;
          this.scheduleReconnect();
        }
      }
    }, 5_000);
  }
  private ingest(value: unknown) {
    if (!value || typeof value !== "object") return null;
    const q = value as ZerionLiveQuote;
    if (
      !["upstox", "coindcx", "forex"].includes(q.provider) ||
      !q.instrumentId ||
      !q.symbol ||
      !Number.isFinite(q.price)
    ) {
      return null;
    }
    for (const alias of aliases(q)) this.quotes.set(alias, q);
    this.lastQuoteAt = Date.now();
    this.setStatus("LIVE");
    this.emit();
    return q;
  }
  connect() {
    if (typeof window === "undefined" || !this.refs.size) return;
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    this.setStatus("RECONNECTING");
    const socket = new WebSocket(this.url());
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.lastGatewayMessageAt = Date.now();
      this.setStatus("RECONNECTING");
      this.startHealth();
      const instruments = [...this.refs.keys()];
      if (instruments.length) socket.send(JSON.stringify({ type: "subscribe", instruments }));
    });

    socket.addEventListener("message", (event) => {
      this.lastGatewayMessageAt = Date.now();
      try {
        const frame = JSON.parse(event.data) as GatewayEnvelope;
        if (frame.type === "snapshot" && Array.isArray(frame.data)) {
          for (const item of frame.data) this.ingest(item);
          this.setStatus("LIVE");
          return;
        }
        if (frame.type === "quote") {
          this.ingest(frame.data);
          return;
        }
        // Heartbeat/health frames also prove the transport is alive.
        this.setStatus("LIVE");
      } catch {
        // Ignore malformed frames without tearing down a healthy socket.
      }
    });

    socket.addEventListener("error", () => {
      if (socket.readyState === WebSocket.OPEN) socket.close();
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      if (!this.refs.size) {
        this.setStatus("DISCONNECTED");
        return;
      }
      this.setStatus("RECONNECTING");
      this.scheduleReconnect();
    });
  }
  forceReconnect() {
    if (!this.refs.size) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      const instruments = [...this.refs.keys()];
      if (instruments.length) {
        this.socket.send(JSON.stringify({ type: "subscribe", instruments }));
      }
      return;
    }
    this.connect();
  }
  subscribe(instruments: string[], listener: Listener) {
    this.listeners.add(listener);
    const wanted = [...new Set(instruments.map(norm).filter(Boolean))];
    const added: string[] = [];
    for (const id of wanted) {
      const count = this.refs.get(id) ?? 0;
      this.refs.set(id, count + 1);
      if (count === 0) added.push(id);
    }
    this.connect();
    if (added.length && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "subscribe", instruments: added }));
    }
    return () => {
      this.listeners.delete(listener);
      const removed: string[] = [];
      for (const id of wanted) {
        const count = this.refs.get(id) ?? 0;
        if (count <= 1) {
          this.refs.delete(id);
          removed.push(id);
        } else {
          this.refs.set(id, count - 1);
        }
      }
      if (removed.length && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "unsubscribe", instruments: removed }));
      }
      if (!this.refs.size) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.socket?.close();
        this.socket = null;
        if (this.healthTimer) {
          clearInterval(this.healthTimer);
          this.healthTimer = null;
        }
        this.lastGatewayMessageAt = 0;
        this.setStatus("DISCONNECTED");
      }
    };
  }
  quoteFor(values: string[]) {
    for (const value of values.map(norm)) {
      const quote = this.quotes.get(value);
      if (quote) return quote;
    }
    return null;
  }
  snapshot(wanted: Set<string>) {
    const out: Record<string, ZerionLiveQuote> = {};
    for (const id of wanted) {
      const quote = this.quotes.get(id);
      if (quote) out[id] = quote;
    }
    return { quotes: out };
  }
}

const gateway = new Gateway();

if (typeof window !== "undefined") {
  window.addEventListener("online", () => gateway.forceReconnect());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) gateway.forceReconnect();
  });
}

export function subscribeZerionRealtime(
  instruments: string[],
  listener: (quote: ZerionLiveQuote | null) => void,
) {
  const notify = () => listener(gateway.quoteFor(instruments));
  const off = gateway.subscribe(instruments, notify);
  notify();
  return off;
}

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
    lastGatewayMessageAt: gateway.lastGatewayMessageAt,
    transportOpen: gateway.socket?.readyState === WebSocket.OPEN,
  };
}
