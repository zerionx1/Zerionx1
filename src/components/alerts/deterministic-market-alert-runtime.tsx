"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useZerionFeedStatus,
  useZerionMarketStream,
} from "@/hooks/use-zerion-market-stream";

type Alert = {
  id: string;
  symbol: string;
  operator: ">" | ">=" | "<" | "<=" | "crosses-above" | "crosses-below";
  threshold: number;
  status: string;
};

type Resolved = {
  symbol: string;
  instrumentId: string;
};

function compare(op: Alert["operator"], price: number, threshold: number) {
  if (op === ">") return price > threshold;
  if (op === ">=") return price >= threshold;
  if (op === "<") return price < threshold;
  if (op === "<=") return price <= threshold;
  return false;
}

export function DeterministicMarketAlertRuntime() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolved, setResolved] = useState<Resolved[]>([]);
  const feed = useZerionFeedStatus();
  const history = useRef(new Map<string, number[]>());
  const fired = useRef(new Set<string>());
  const staleFired = useRef(false);

  useEffect(() => {
    void fetch("/api/alerts", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) =>
        setAlerts(
          ((body.data ?? []) as Alert[]).filter((item) => item.status === "active"),
        ),
      )
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
        const r = await fetch(
          `/api/markets/search?q=${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        const body = await r.json();
        const hit = (body.data ?? []).find(
          (row: { id?: string }) =>
            row.id?.startsWith("upstox:") || row.id?.startsWith("coindcx:"),
        );
        return hit ? { symbol, instrumentId: hit.id } : null;
      }),
    ).then((items) => {
      if (active)
        setResolved(
          items.filter((item): item is Resolved => Boolean(item)),
        );
    });
    return () => {
      active = false;
    };
  }, [alerts]);

  const streamKeys = useMemo(
    () => resolved.flatMap((item) => [item.instrumentId, item.symbol]),
    [resolved],
  );
  const quotes = useZerionMarketStream(streamKeys);

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
      body: JSON.stringify({
        kind: "market-alert",
        title,
        body,
        priority: "high",
        eventKey,
        actionUrl,
        data,
      }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (feed.status === "STALE" || feed.status === "DISCONNECTED") {
      if (!staleFired.current) {
        staleFired.current = true;
        void emit(
          `feed-${feed.status}-${Math.floor(Date.now() / 60000)}`,
          `Market feed ${feed.status.toLowerCase()}`,
          "Zerion has stopped receiving fresh provider ticks. Realtime decisions are paused until the feed recovers.",
          "/dashboard/markets",
          { feedStatus: feed.status },
        );
      }
    } else {
      staleFired.current = false;
    }
  }, [feed.status]);

  useEffect(() => {
    for (const item of resolved) {
      const quote =
        quotes[item.instrumentId.toUpperCase()] ??
        quotes[item.symbol.toUpperCase()];
      if (!quote) continue;

      const key = item.instrumentId.toUpperCase();
      const series = history.current.get(key) ?? [];
      if (series.at(-1) === quote.price) continue;
      const next = [...series, quote.price].slice(-30);
      history.current.set(key, next);

      const actionUrl = `/dashboard/charts?instrument=${encodeURIComponent(item.instrumentId)}&symbol=${encodeURIComponent(item.symbol)}&tf=5m`;

      for (const alert of alerts.filter((a) => a.symbol === item.symbol)) {
        const previous = next.at(-2);
        const threshold = Number(alert.threshold);
        const crossedAbove =
          alert.operator === "crosses-above" &&
          previous != null &&
          previous <= threshold &&
          quote.price > threshold;
        const crossedBelow =
          alert.operator === "crosses-below" &&
          previous != null &&
          previous >= threshold &&
          quote.price < threshold;
        if (
          compare(alert.operator, quote.price, threshold) ||
          crossedAbove ||
          crossedBelow
        ) {
          void emit(
            `configured-alert-${alert.id}-${Math.floor(Date.now() / 60000)}`,
            `${item.symbol} crossed configured level`,
            `${item.symbol} is ${quote.price.toLocaleString()} versus configured level ${threshold.toLocaleString()}.`,
            actionUrl,
            { symbol: item.symbol, price: quote.price, threshold },
          );
        }
      }

      if (next.length >= 12) {
        const first = next[0]!;
        const recent = next.slice(-6);
        const movePct = ((quote.price - first) / first) * 100;
        const recentRange =
          ((Math.max(...recent) - Math.min(...recent)) /
            Math.max(1e-9, recent[0]!)) *
          100;
        const prior = next.slice(0, -1);
        const priorHigh = Math.max(...prior);
        const priorLow = Math.min(...prior);

        if (Math.abs(movePct) >= 0.6) {
          void emit(
            `momentum-${key}-${Math.sign(movePct)}-${Math.floor(Date.now() / 300000)}`,
            `${item.symbol} momentum ${movePct > 0 ? "strengthening" : "weakening"}`,
            `Provider ticks moved ${movePct.toFixed(2)}% across the current rolling window.`,
            actionUrl,
            { symbol: item.symbol, movePct },
          );
        }
        if (recentRange >= 0.5) {
          void emit(
            `volatility-${key}-${Math.floor(Date.now() / 300000)}`,
            `${item.symbol} volatility increased`,
            `Rolling provider-tick range expanded to ${recentRange.toFixed(2)}%.`,
            actionUrl,
            { symbol: item.symbol, recentRange },
          );
        }
        if (quote.price > priorHigh || quote.price < priorLow) {
          void emit(
            `breakout-${key}-${quote.price > priorHigh ? "up" : "down"}-${Math.floor(Date.now() / 300000)}`,
            `${item.symbol} rolling breakout`,
            `Price broke ${quote.price > priorHigh ? "above" : "below"} the recent provider-tick range.`,
            actionUrl,
            { symbol: item.symbol, price: quote.price },
          );
        }
      }
    }
  }, [alerts, quotes, resolved]);

  return null;
}
