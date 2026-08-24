"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useZerionMarketStream } from "@/hooks/use-zerion-market-stream";

type Alert = {
  id: string;
  symbol: string;
  operator: ">" | ">=" | "<" | "<=" | "crosses-above" | "crosses-below";
  threshold: number;
  status: string;
};
type Resolved = { symbol: string; instrumentId: string };

function compare(op: Alert["operator"], p: number, t: number) {
  if (op === ">") return p > t;
  if (op === ">=") return p >= t;
  if (op === "<") return p < t;
  if (op === "<=") return p <= t;
  return false;
}

export function DeterministicMarketAlertRuntime() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolved, setResolved] = useState<Resolved[]>([]);
  const history = useRef(new Map<string, number[]>());
  const fired = useRef(new Set<string>());

  useEffect(() => {
    void fetch("/api/alerts", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setAlerts(((b.data ?? []) as Alert[]).filter((x) => x.status === "active")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const symbols = [...new Set(alerts.map((a) => a.symbol))];
    if (!symbols.length) {
      setResolved([]);
      return;
    }
    let active = true;
    void Promise.all(
      symbols.map(async (symbol) => {
        const r = await fetch(`/api/markets/search?q=${encodeURIComponent(symbol)}`, { cache: "no-store" });
        const b = await r.json();
        const hit = (b.data ?? []).find(
          (row: { id?: string }) => row.id?.startsWith("upstox:") || row.id?.startsWith("coindcx:"),
        );
        return hit ? { symbol, instrumentId: hit.id } : null;
      }),
    ).then((items) => {
      if (active) setResolved(items.filter((x): x is Resolved => Boolean(x)));
    });
    return () => {
      active = false;
    };
  }, [alerts]);

  const keys = useMemo(() => resolved.flatMap((x) => [x.instrumentId, x.symbol]), [resolved]);
  const quotes = useZerionMarketStream(keys);

  async function emit(
    eventKey: string,
    title: string,
    body: string,
    actionUrl: string,
    data: Record<string, unknown>,
  ) {
    if (fired.current.has(eventKey)) return;
    fired.current.add(eventKey);
    await fetch("/api/notifications/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "market-alert", title, body, priority: "high", eventKey, actionUrl, data }),
    }).catch(() => {});
  }

  // Feed outage notifications were deliberately removed. The realtime gateway
  // reconnects in the market-stream hook; users should not receive repeated
  // "disconnected" cards for a transport condition the app can self-heal.
  useEffect(() => {
    for (const item of resolved) {
      const q = quotes[item.instrumentId.toUpperCase()] ?? quotes[item.symbol.toUpperCase()];
      if (!q) continue;
      const key = item.instrumentId.toUpperCase();
      const series = history.current.get(key) ?? [];
      if (series.at(-1) === q.price) continue;
      const next = [...series, q.price].slice(-30);
      history.current.set(key, next);
      const url = `/dashboard/charts?instrument=${encodeURIComponent(item.instrumentId)}&symbol=${encodeURIComponent(item.symbol)}&tf=5m`;
      for (const alert of alerts.filter((a) => a.symbol === item.symbol)) {
        const prev = next.at(-2);
        const t = Number(alert.threshold);
        const up = alert.operator === "crosses-above" && prev != null && prev <= t && q.price > t;
        const down = alert.operator === "crosses-below" && prev != null && prev >= t && q.price < t;
        if (compare(alert.operator, q.price, t) || up || down) {
          void emit(
            `configured-${alert.id}-${Math.floor(Date.now() / 300000)}`,
            `${item.symbol} crossed configured level`,
            `${item.symbol} is ${q.price.toLocaleString()} versus ${t.toLocaleString()}.`,
            url,
            { symbol: item.symbol, price: q.price, threshold: t },
          );
        }
      }
    }
  }, [alerts, quotes, resolved]);

  return null;
}
