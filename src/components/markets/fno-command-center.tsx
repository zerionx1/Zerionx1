"use client";

import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";

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

function numberFrom(
  source: Record<string, unknown> | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function fmt(value: number | null, digits = 2) {
  return value == null
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function FnoCommandCenter() {
  const router = useRouter();
  const [underlying, setUnderlying] = useState("NIFTY 50");
  const [custom, setCustom] = useState("");
  const [expiry, setExpiry] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const url = new URL("/api/markets/options", window.location.origin);
      url.searchParams.set("underlying", underlying);
      if (expiry) url.searchParams.set("expiry", expiry);

      const response = await fetch(url, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Option chain unavailable");
      }

      const next = body.data as Payload;
      setData(next);
      if (!expiry && next.expiry) setExpiry(next.expiry);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Option chain unavailable",
      );
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [expiry, underlying]);

  useEffect(() => {
    void load();
  }, [load]);

  const contractByKey = useMemo(() => {
    const map = new Map<string, Contract>();
    for (const contract of data?.contracts ?? []) {
      map.set(contract.instrumentKey, contract);
    }
    return map;
  }, [data]);

  function openContract(key: string | undefined) {
    if (!key) return;
    const contract = contractByKey.get(key);
    const symbol = contract?.symbol ?? key;
    const params = new URLSearchParams({
      id: `upstox:${key}`,
      symbol,
      name: symbol,
      market: "indian-options",
      exchange: "NSE",
    });
    router.push(`/dashboard/markets/instrument?${params.toString()}`);
  }

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
            <p className="eyebrow">UPSTOX · LIVE NSE F&O</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Futures & Options terminal
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Real contracts, expiries, strikes, lot sizes and provider
              instrument keys. No fabricated option symbols.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["NIFTY 50", "BANKNIFTY"].map((value) => (
              <button
                type="button"
                key={value}
                className={`luxury-filter ${
                  underlying === value ? "luxury-filter--active" : ""
                }`}
                onClick={() => choose(value)}
              >
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
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && custom.trim()) {
                  choose(custom.trim());
                }
              }}
              placeholder="Search F&O underlying e.g. RELIANCE, TCS, NIFTY..."
            />
          </div>
          <button
            type="button"
            className="zx-secondary-action"
            onClick={() => {
              if (custom.trim()) choose(custom.trim());
            }}
          >
            Open underlying
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">UNDERLYING LIVE CHART</p>
            <h3 className="mt-1 text-xl font-semibold">{underlying}</h3>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="zx-secondary-action"
            disabled={busy}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>
        <div className="mt-4">
          <TradingViewAdvancedChart
            symbol={underlying}
            interval="5"
            height={520}
          />
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">OPTION CHAIN</p>
            <h3 className="mt-1 text-xl font-semibold">
              {underlying} · {data?.expiry || "expiry"}
            </h3>
          </div>
          <label className="min-w-[190px]">
            Expiry
            <select
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            >
              {(data?.expiries ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message ? <div className="zx-error-banner mt-4">{message}</div> : null}

        {busy ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-center text-xs">
              <thead className="text-white/45">
                <tr>
                  <th colSpan={4} className="py-2 text-emerald-200/80">
                    CALL
                  </th>
                  <th className="py-2">STRIKE</th>
                  <th colSpan={4} className="py-2 text-rose-200/80">
                    PUT
                  </th>
                </tr>
                <tr>
                  <th>OI</th>
                  <th>Volume</th>
                  <th>IV</th>
                  <th>LTP</th>
                  <th>Price</th>
                  <th>LTP</th>
                  <th>IV</th>
                  <th>Volume</th>
                  <th>OI</th>
                </tr>
              </thead>
              <tbody>
                {(data?.chain ?? []).map((row, index) => {
                  const callMD = row.call_options?.market_data;
                  const callGreeks = row.call_options?.option_greeks;
                  const putMD = row.put_options?.market_data;
                  const putGreeks = row.put_options?.option_greeks;

                  const callLtp = numberFrom(callMD, "ltp", "last_price");
                  const putLtp = numberFrom(putMD, "ltp", "last_price");
                  const callOi = numberFrom(callMD, "oi", "open_interest");
                  const putOi = numberFrom(putMD, "oi", "open_interest");
                  const callVolume = numberFrom(callMD, "volume", "vol");
                  const putVolume = numberFrom(putMD, "volume", "vol");
                  const callIv = numberFrom(
                    callGreeks,
                    "iv",
                    "implied_volatility",
                  );
                  const putIv = numberFrom(
                    putGreeks,
                    "iv",
                    "implied_volatility",
                  );

                  return (
                    <tr
                      key={`${row.strike_price ?? index}-${row.expiry_date ?? ""}`}
                      className="border-t border-white/8"
                    >
                      <td>{fmt(callOi, 0)}</td>
                      <td>{fmt(callVolume, 0)}</td>
                      <td>{fmt(callIv)}</td>
                      <td>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 hover:bg-white/5"
                          onClick={() =>
                            openContract(row.call_options?.instrument_key)
                          }
                        >
                          {fmt(callLtp)}
                        </button>
                      </td>
                      <td className="bg-white/[.035] py-3 font-semibold">
                        {fmt(Number(row.strike_price ?? 0))}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 hover:bg-white/5"
                          onClick={() =>
                            openContract(row.put_options?.instrument_key)
                          }
                        >
                          {fmt(putLtp)}
                        </button>
                      </td>
                      <td>{fmt(putIv)}</td>
                      <td>{fmt(putVolume, 0)}</td>
                      <td>{fmt(putOi, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!data?.chain?.length ? (
              <p className="py-8 text-center text-white/45">
                No option chain rows returned for this expiry.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
