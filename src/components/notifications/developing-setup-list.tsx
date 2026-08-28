"use client";

import { Activity, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Row = { symbol?: string; market?: string; price?: number; confidence?: number; quality_score?: number; reason?: string; analysis?: Record<string, unknown> };

export function DevelopingSetupList() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => {
    const response = await fetch("/api/agents/developing", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const body = await response.json().catch(() => ({}));
    setRows(body.data?.setups ?? []);
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15_000); return () => window.clearInterval(timer); }, [load]);
  if (!rows.length) return null;
  return (
    <div className="zx-developing-setups">
      <div className="zx-developing-setups__head"><div><small>CONTINUOUS SCANNER</small><strong>Developing Setups</strong><p>Watch-only structures below Zerion&apos;s qualified-trade gate. They cannot be executed from this lane.</p></div><button className="zx-secondary-action" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</button></div>
      <div className="zx-developing-setups__grid">
        {rows.slice(0, 12).map((row, index) => <article key={`${row.symbol ?? "setup"}-${index}`}><Activity className="h-4 w-4" /><div><strong>{String(row.symbol ?? "Market")}</strong><small>{String(row.market ?? "")} · Quality {Number(row.quality_score ?? 0)} · Confidence {Number(row.confidence ?? 0)}%</small><p>{String(row.reason ?? "Structure is developing.")}</p></div></article>)}
      </div>
    </div>
  );
}
