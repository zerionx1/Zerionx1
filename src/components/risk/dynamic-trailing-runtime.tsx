"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useZerionMarketStream } from "@/hooks/use-zerion-market-stream";

type Watch = {
  proposalId: string;
  symbol: string;
  instrumentId?: string;
  enabled: boolean;
  autoTrailing: boolean;
};

export function DynamicTrailingRuntime() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const evaluating = useRef(false);
  const lastSignature = useRef("");

  useEffect(() => {
    let active = true;
    void fetch("/api/trailing/run", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => {
        if (active) setWatches(body.data?.items ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const instruments = useMemo(
    () =>
      [...new Set(watches.flatMap((w) => [w.instrumentId, w.symbol]).filter((v): v is string => Boolean(v)))],
    [watches],
  );
  const quotes = useZerionMarketStream(instruments);

  const signature = useMemo(
    () =>
      Object.entries(quotes)
        .map(([key, q]) => `${key}:${q.price}:${q.timestamp}`)
        .sort()
        .join("|"),
    [quotes],
  );

  useEffect(() => {
    if (!signature || signature === lastSignature.current || evaluating.current) return;
    lastSignature.current = signature;
    evaluating.current = true;
    void fetch("/api/trailing/run", { method: "POST", cache: "no-store" })
      .catch(() => {})
      .finally(() => {
        evaluating.current = false;
      });
  }, [signature]);

  return null;
}
