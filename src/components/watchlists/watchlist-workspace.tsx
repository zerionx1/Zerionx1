"use client";

import Link from "next/link";
import {
  Check, ChevronDown, GripVertical, LoaderCircle, Plus, RefreshCw, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GlobalMarketSearch } from "@/components/markets/global-market-search";
import { useZerionFeedStatus, useZerionMarketStream } from "@/hooks/use-zerion-market-stream";
import type { MarketInstrument, MarketQuote } from "@/types/market";
import type { Watchlist, WatchlistItem } from "@/types/watchlist";

type Api<T> = { data?: T; error?: { message?: string } };

export function WatchlistWorkspace() {
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [activeId, setActiveId] = useState("");
  const [bootstrapQuotes, setBootstrapQuotes] = useState<Record<string, MarketQuote>>({});
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const active = useMemo(
    () => lists.find((list) => list.id === activeId) ?? lists[0],
    [lists, activeId],
  );
  const streamKeys = useMemo(
    () => active?.items.flatMap((item) => [item.instrumentId, item.symbol]) ?? [],
    [active],
  );
  const live = useZerionMarketStream(streamKeys);
  const feed = useZerionFeedStatus();

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/watchlists", { cache: "no-store" });
      const body = (await response.json()) as Api<Watchlist[]>;
      const next = body.data ?? [];
      setLists(next);
      setActiveId((current) => current || next[0]?.id || "");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!active?.items.length) {
      setBootstrapQuotes({});
      return;
    }
    let mounted = true;
    Promise.all(
      active.items.map(async (item) => {
        const response = await fetch(
          `/api/markets/quotes?symbols=${encodeURIComponent(item.symbol)}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as Api<MarketQuote[] | MarketQuote>;
        const value = Array.isArray(body.data) ? body.data[0] : body.data;
        return value ? ([item.symbol, value] as const) : null;
      }),
    ).then((values) => {
      if (mounted)
        setBootstrapQuotes(
          Object.fromEntries(
            values.filter(
              (value): value is readonly [string, MarketQuote] => Boolean(value),
            ),
          ),
        );
    });
    return () => { mounted = false; };
  }, [active]);

  async function createList() {
    const name = window.prompt("Watchlist name");
    if (!name?.trim()) return;
    const response = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: "Multi-market watchlist",
        color: "champagne",
      }),
    });
    const body = (await response.json()) as Api<Watchlist>;
    if (body.data) {
      setLists((current) => [...current, body.data!]);
      setActiveId(body.data.id);
    }
  }

  async function persistItems(items: WatchlistItem[]) {
    if (!active) return;
    setLists((current) =>
      current.map((list) => (list.id === active.id ? { ...list, items } : list)),
    );
    const response = await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, items }),
    });
    if (!response.ok) {
      setMessage("Unable to save watchlist");
      await load();
    } else setMessage("Saved");
  }

  async function addInstrument(instrument: MarketInstrument) {
    if (!active) return;
    setShowSearch(false);
    if (active.items.some((item) => item.instrumentId === instrument.id)) {
      setMessage("Already in this watchlist");
      return;
    }
    await persistItems([
      ...active.items,
      {
        id: crypto.randomUUID(),
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        displayName: instrument.displayName,
        exchange: instrument.exchange,
        market: instrument.market,
        addedAt: new Date().toISOString(),
      },
    ]);
  }

  async function removeItem(id: string) {
    if (active) await persistItems(active.items.filter((item) => item.id !== id));
  }

  async function deleteList() {
    if (!active || active.isDefault) return;
    await fetch(`/api/watchlists?id=${encodeURIComponent(active.id)}`, {
      method: "DELETE",
    });
    setActiveId("");
    await load();
  }

  const quoteFor = (item: WatchlistItem) => {
    const realtime =
      live[item.instrumentId.toUpperCase()] ?? live[item.symbol.toUpperCase()];
    if (realtime) {
      return {
        price: realtime.price,
        changePercent: realtime.changePercent,
        provider: realtime.provider,
        realtime: true,
      };
    }
    const fallback = bootstrapQuotes[item.symbol];
    return fallback
      ? {
          price: fallback.price,
          changePercent: fallback.changePercent,
          provider: fallback.source === "provider" ? "provider" : "unavailable",
          realtime: false,
        }
      : null;
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <select
              value={active?.id ?? ""}
              onChange={(event) => setActiveId(event.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#2F2A25] px-4 pr-10 text-sm outline-none"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.items.length})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-white/40" />
          </div>
          <span className="status-pill">{feed.status}</span>
          <button onClick={createList} className="zx-primary-action">
            <Plus className="mr-2 h-4 w-4" /> New list
          </button>
          <button onClick={() => setShowSearch(true)} className="zx-secondary-action">
            <Plus className="mr-2 h-4 w-4" /> Add symbol
          </button>
          {active && !active.isDefault ? (
            <button onClick={() => void deleteList()} className="zx-exit-action">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="mt-3 flex items-center gap-2 text-xs">
            <Check className="h-3.5 w-3.5" /> {message}
          </p>
        ) : null}
      </section>

      {showSearch ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#2F2A25] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add provider instrument</h2>
              <button onClick={() => setShowSearch(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <GlobalMarketSearch onAdd={addInstrument} />
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035]">
        <div className="flex items-center justify-between border-b border-white/8 p-5">
          <div>
            <p className="eyebrow">REALTIME WATCHLIST</p>
            <h2>{active?.name ?? "Watchlists"}</h2>
          </div>
          <button onClick={() => void load()} className="zx-secondary-action">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh list
          </button>
        </div>
        {busy ? (
          <div className="flex min-h-52 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : !active?.items.length ? (
          <div className="p-10 text-center">No instruments yet.</div>
        ) : (
          <div className="divide-y divide-white/7">
            {active.items.map((item) => {
              const q = quoteFor(item);
              return (
                <article
                  key={item.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 hover:bg-white/[0.025]"
                >
                  <GripVertical className="h-4 w-4 text-white/20" />
                  <Link
                    className="min-w-0"
                    href={`/dashboard/charts?instrument=${encodeURIComponent(item.instrumentId)}&symbol=${encodeURIComponent(item.symbol)}&tf=5m`}
                  >
                    <div className="flex items-center gap-2">
                      <strong>{item.symbol}</strong>
                      <span className="data-badge">
                        {q?.provider ?? item.exchange ?? item.market}
                      </span>
                    </div>
                    <p className="truncate text-xs text-white/40">
                      {item.displayName ?? item.instrumentId}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3">
                    {q ? (
                      <Link
                        className="text-right"
                        href={`/dashboard/charts?instrument=${encodeURIComponent(item.instrumentId)}&symbol=${encodeURIComponent(item.symbol)}&tf=5m`}
                      >
                        <strong>{q.price.toLocaleString()}</strong>
                        <p className={q.changePercent >= 0 ? "positive" : "negative"}>
                          {q.changePercent.toFixed(2)}% · {q.realtime ? "LIVE" : "REST"}
                        </p>
                      </Link>
                    ) : (
                      <span className="text-xs text-white/35">Provider unavailable</span>
                    )}
                    <button
                      onClick={() => void removeItem(item.id)}
                      className="rounded-full border border-white/8 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
