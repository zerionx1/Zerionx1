"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
type Entry = {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  notes: string;
  tags: string[];
  opened_at: string;
  closed_at: string | null;
};
const empty = {
  symbol: "BTC/USDT",
  side: "buy",
  quantity: 1,
  entry_price: 0,
  exit_price: "",
  notes: "",
  tags: "",
};
export function TradeJournal() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState("Loading…");
  async function load() {
    const r = await fetch("/api/journal");
    const j = await r.json().catch(() => ({}));
    setEntries(j.data ?? []);
    setStatus(r.ok ? "" : "Unable to load journal");
  }
  useEffect(() => {
    void load();
  }, []);
  async function save() {
    setStatus("Saving…");
    const payload = {
      ...form,
      quantity: Number(form.quantity),
      entry_price: Number(form.entry_price),
      exit_price: form.exit_price ? Number(form.exit_price) : null,
      tags: form.tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    const r = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus(r.ok ? "Saved" : "Save failed");
    if (r.ok) {
      setForm(empty);
      await load();
    }
  }
  async function remove(id: string) {
    await fetch(`/api/journal?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
  }
  return (
    <div className="zx-mobile-stack grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="panel zx-journal-form min-w-0">
        <h2 className="text-2xl font-semibold">Add trade note</h2>
        <div className="mt-5 grid gap-4">
          <label>
            Symbol
            <input
              value={form.symbol}
              onChange={(e) =>
                setForm((v) => ({ ...v, symbol: e.target.value }))
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Side
              <select
                value={form.side}
                onChange={(e) =>
                  setForm((v) => ({ ...v, side: e.target.value }))
                }
              >
                <option>buy</option>
                <option>sell</option>
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                step="any"
                value={form.quantity}
                onChange={(e) =>
                  setForm((v) => ({ ...v, quantity: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Entry
              <input
                type="number"
                step="any"
                value={form.entry_price}
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    entry_price: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Exit
              <input
                type="number"
                step="any"
                value={form.exit_price}
                onChange={(e) =>
                  setForm((v) => ({ ...v, exit_price: e.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Tags
            <input
              value={form.tags}
              placeholder="breakout, disciplined"
              onChange={(e) => setForm((v) => ({ ...v, tags: e.target.value }))}
            />
          </label>
          <label>
            Notes
            <textarea
              rows={5}
              value={form.notes}
              onChange={(e) =>
                setForm((v) => ({ ...v, notes: e.target.value }))
              }
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save}>Save entry</Button>
            <span className="text-sm opacity-70">{status}</span>
          </div>
        </div>
      </section>
      <section className="panel min-w-0">
        <div className="panel-header">
          <h2>Journal history</h2>
          <span className="data-badge">{entries.length} entries</span>
        </div>
        <div className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <p className="opacity-70">No journal entries yet.</p>
          ) : (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-[#E6D8C3] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <strong className="break-words">
                      {entry.symbol} · {entry.side.toUpperCase()}
                    </strong>
                    <p className="mt-1 text-sm opacity-70">
                      Qty {entry.quantity} · Entry {entry.entry_price}
                      {entry.exit_price !== null
                        ? ` · Exit ${entry.exit_price}`
                        : ""}
                    </p>
                  </div>
                  <button
                    className="text-sm opacity-70"
                    onClick={() => remove(entry.id)}
                  >
                    Delete
                  </button>
                </div>
                {entry.notes && (
                  <p className="mt-3 break-words">{entry.notes}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="data-badge">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
