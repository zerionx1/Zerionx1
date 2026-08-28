"use client";

import Link from "next/link";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import type { MarketInstrument } from "@/types/market";

type Contract = {
  id: string;
  instrumentKey: string;
  symbol: string;
  expiry: string;
  strike: number;
  type: "CE" | "PE" | "";
  lotSize: number;
  tickSize: number;
  weekly: boolean;
};

type Side = {
  instrument_key?: string;
  market_data?: Record<string, unknown>;
  option_greeks?: Record<string, unknown>;
};

type ChainRow = {
  expiry_date?: string;
  strike_price?: number;
  underlying_spot_price?: number;
  call_options?: Side;
  put_options?: Side;
};

type Payload = {
  underlying: string;
  requested: string;
  expiry: string;
  expiries: string[];
  contracts: Contract[];
  chain: ChainRow[];
};

function numberFrom(source: Record<string, unknown> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
const fmt = (value: number | null, digits = 2) =>
  value == null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: digits });

export function FnoCommandCenter() {
  const [underlying, setUnderlying] = useState("NIFTY 50");
  const [custom, setCustom] = useState("");
  const [expiry, setExpiry] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [underlyingInstrument, setUnderlyingInstrument] =
    useState<MarketInstrument | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const [optionsResponse, searchResponse] = await Promise.all([
        fetch(
          `/api/markets/options?underlying=${encodeURIComponent(underlying)}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/markets/search?q=${encodeURIComponent(underlying)}`,
          { cache: "no-store" },
        ),
      ]);
      const [body, searchBody] = await Promise.all([
        optionsResponse.json(),
        searchResponse.json(),
      ]);
      if (!optionsResponse.ok)
        throw new Error(body.error?.message ?? "Option chain unavailable");
      const next = body.data as Payload;
      setData(next);
      if (!expiry && next.expiry) setExpiry(next.expiry);
      setUnderlyingInstrument(
        ((searchBody.data ?? []) as MarketInstrument[]).find((row) =>
          row.id.startsWith("upstox:"),
        ) ?? null,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Option chain unavailable");
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [expiry, underlying]);

  useEffect(() => { void load(); }, [load]);

  const contractByKey = useMemo(() => {
    const map = new Map<string, Contract>();
    for (const contract of data?.contracts ?? []) map.set(contract.instrumentKey, contract);
    return map;
  }, [data]);

  const href = (key?: string) => {
    if (!key) return "#";
    const contract = contractByKey.get(key);
    const symbol = contract?.symbol ?? key;
    return `/dashboard/charts?instrument=${encodeURIComponent(`upstox:${key}`)}&symbol=${encodeURIComponent(symbol)}&tf=5m`;
  };

  const paperHref = (key?: string) => {
    const contract = key ? contractByKey.get(key) : undefined;
    return `/dashboard/paper/order?instrument=${encodeURIComponent(key ? `upstox:${key}` : "")}&symbol=${encodeURIComponent(contract?.symbol ?? "")}`;
  };

  const liveHref = (key?: string) => {
    const contract = key ? contractByKey.get(key) : undefined;
    return `/dashboard/live-trading/order?instrument=${encodeURIComponent(key ?? "")}&symbol=${encodeURIComponent(contract?.symbol ?? "")}`;
  };

  function choose(value: string) {
    setUnderlying(value);
    setExpiry("");
    setData(null);
  }

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">UPSTOX · NSE F&O</p>
            <h2 className="mt-2 text-2xl font-semibold">Futures & Options terminal</h2>
            <p className="mt-2 text-sm opacity-60">
              Provider contracts, expiries, strikes, OI, volume and LTP. No generated option symbols.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["NIFTY 50", "BANKNIFTY"].map((value) => (
              <button key={value} className={`luxury-filter ${underlying === value ? "luxury-filter--active" : ""}`} onClick={() => choose(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="zx-chart-search">
            <Search className="h-4 w-4" />
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && custom.trim() && choose(custom.trim())}
              placeholder="RELIANCE, TCS, NIFTY, BANKNIFTY…"
            />
          </div>
          <button className="zx-secondary-action" onClick={() => custom.trim() && choose(custom.trim())}>
            Open underlying
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><p className="eyebrow">ZERION UNDERLYING CHART</p><h3>{underlying}</h3></div>
          <button onClick={() => void load()} className="zx-secondary-action" disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </button>
        </div>
        <div className="mt-4">
          <ZerionProviderChart
            instrument={underlyingInstrument}
            symbol={underlying}
            timeframe="5m"
            height={520}
          />
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">OPTION CHAIN</p><h3>{underlying} · {data?.expiry || "expiry"}</h3></div>
          <label className="min-w-[190px]">
            Expiry
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {(data?.expiries ?? []).map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
        {message ? <div className="zx-error-banner mt-4">{message}</div> : null}
        {busy ? (
          <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1120px] text-center text-xs">
              <thead>
                <tr><th colSpan={5}>CALL</th><th>STRIKE</th><th colSpan={5}>PUT</th></tr>
                <tr><th>OI</th><th>Vol</th><th>IV</th><th>LTP</th><th>Trade</th><th>Price</th><th>Trade</th><th>LTP</th><th>IV</th><th>Vol</th><th>OI</th></tr>
              </thead>
              <tbody>
                {(data?.chain ?? []).map((row, index) => {
                  const callKey = row.call_options?.instrument_key;
                  const putKey = row.put_options?.instrument_key;
                  const callMD = row.call_options?.market_data;
                  const putMD = row.put_options?.market_data;
                  const callG = row.call_options?.option_greeks;
                  const putG = row.put_options?.option_greeks;
                  return (
                    <tr key={`${row.strike_price ?? index}-${row.expiry_date ?? ""}`} className="border-t border-[#E6D8C3]">
                      <td>{fmt(numberFrom(callMD, "oi", "open_interest"), 0)}</td>
                      <td>{fmt(numberFrom(callMD, "volume", "vol"), 0)}</td>
                      <td>{fmt(numberFrom(callG, "iv", "implied_volatility"))}</td>
                      <td><Link href={href(callKey)} className="inline-block min-w-16 rounded-lg px-3 py-3 hover:bg-[#F7F4ED]">{fmt(numberFrom(callMD, "ltp", "last_price"))}</Link></td>
                      <td><div className="flex gap-1"><Link className="luxury-filter" href={paperHref(callKey)}>Paper</Link><Link className="luxury-filter" href={liveHref(callKey)}>Live</Link></div></td>
                      <td className="bg-[#F7F4ED]/[.035] py-3 font-semibold">{fmt(Number(row.strike_price ?? 0))}</td>
                      <td><div className="flex gap-1"><Link className="luxury-filter" href={paperHref(putKey)}>Paper</Link><Link className="luxury-filter" href={liveHref(putKey)}>Live</Link></div></td>
                      <td><Link href={href(putKey)} className="inline-block min-w-16 rounded-lg px-3 py-3 hover:bg-[#F7F4ED]">{fmt(numberFrom(putMD, "ltp", "last_price"))}</Link></td>
                      <td>{fmt(numberFrom(putG, "iv", "implied_volatility"))}</td>
                      <td>{fmt(numberFrom(putMD, "volume", "vol"), 0)}</td>
                      <td>{fmt(numberFrom(putMD, "oi", "open_interest"), 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data?.chain?.length ? <p className="py-8 text-center opacity-50">No provider option-chain rows returned.</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}
