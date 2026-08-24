"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import type { PortfolioSnapshot } from "@/types/portfolio";

export function LivePositionsTable() {
  const [data, setData] = useState<PortfolioSnapshot | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let mounted = true;
    void fetch("/api/portfolio", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => {
        if (mounted) setData(body.data ?? null);
      })
      .catch(() => {
        if (mounted) setData(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (data === undefined) {
    return <Card><h3>Live positions</h3><p>Syncing Upstox portfolio…</p></Card>;
  }

  if (!data) {
    return (
      <Card>
        <h3>Live positions</h3>
        <p>Connect Upstox from Trading Connections to sync live positions.</p>
      </Card>
    );
  }

  if (data.positions.length === 0) {
    return (
      <Card>
        <h3>Live positions</h3>
        <p>Upstox is connected. There are currently no open positions or holdings.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3>Live positions</h3>
      <div className="mt-4 grid gap-3">
        {data.positions.map((row) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-2xl border border-[#E6D8C3] p-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <strong>{row.symbol}</strong>
              <p className="text-xs opacity-60">{row.market}</p>
            </div>
            <div>
              <span className="text-xs opacity-60">Qty</span>
              <p>{row.quantity}</p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs opacity-60">Unrealised P&amp;L</span>
              <p>{row.unrealisedPnl.toLocaleString("en-IN")}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
