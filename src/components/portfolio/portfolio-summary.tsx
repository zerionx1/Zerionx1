"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import type { PortfolioSnapshot } from "@/types/portfolio";

export function PortfolioSummary() {
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

  const account = data?.accounts?.[0];

  if (data === undefined) {
    return (
      <div className="grid-3">
        <Card><span>Total equity</span><h3>Syncing…</h3></Card>
        <Card><span>Available margin</span><h3>Syncing…</h3></Card>
        <Card><span>Unrealised P&amp;L</span><h3>Syncing…</h3></Card>
      </div>
    );
  }

  if (!data || !account) {
    return (
      <div className="grid-3">
        <Card><span>Total equity</span><h3>Broker not connected</h3></Card>
        <Card><span>Available margin</span><h3>Broker not connected</h3></Card>
        <Card><span>Unrealised P&amp;L</span><h3>Broker not connected</h3></Card>
      </div>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: account.currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <div className="grid-3">
      <Card>
        <span>Total equity</span>
        <h3>{money(data.totalEquity)}</h3>
      </Card>
      <Card>
        <span>Available margin</span>
        <h3>{money(account.availableMargin)}</h3>
      </Card>
      <Card>
        <span>Unrealised P&amp;L</span>
        <h3>{money(data.totalUnrealisedPnl)}</h3>
      </Card>
    </div>
  );
}
