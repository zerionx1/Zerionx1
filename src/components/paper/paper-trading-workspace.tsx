"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";
import { ActiveStrategyRuntime } from "@/components/strategies/active-strategy-runtime";
import { useZerionMarketStream } from "@/hooks/use-zerion-market-stream";

type Account = {
  currency: string;
  equity: number;
  cashBalance: number;
  buyingPower: number;
  dailyPnl: number;
  totalPnl: number;
};
type Position = {
  id: string;
  symbol: string;
  market: string;
  quantity: number;
  averagePrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
};
type Order = {
  id: string;
  symbol: string;
  market: string;
  side: string;
  type: string;
  quantity: number;
  status: string;
  createdAt: string;
};

const instruments = [
  {
    label: "BTC/USDT",
    symbol: "BTC/USDT",
    market: "crypto",
    tv: "COINDCX:BTCUSDT",
  },
  {
    label: "ETH/USDT",
    symbol: "ETH/USDT",
    market: "crypto",
    tv: "COINDCX:ETHUSDT",
  },
  {
    label: "NIFTY 50",
    symbol: "NIFTY 50",
    market: "indian-index",
    tv: "NSE:NIFTY",
  },
  {
    label: "BANK NIFTY",
    symbol: "BANKNIFTY",
    market: "indian-index",
    tv: "NSE:BANKNIFTY",
  },
  {
    label: "RELIANCE",
    symbol: "RELIANCE",
    market: "indian-equity",
    tv: "NSE:RELIANCE",
  },
] as const;

export function PaperTradingWorkspace() {
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [instrument, setInstrument] = useState(0);
  const [side, setSide] = useState("buy");
  const [type, setType] = useState("market");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);

  const selected = instruments[instrument]!;
  const cryptoSymbols = useMemo(
    () =>
      Array.from(
        new Set([
          ...positions
            .filter((p) => p.market === "crypto")
            .map((p) => p.symbol),
          ...(selected.market === "crypto" ? [selected.symbol] : []),
        ]),
      ),
    [positions, selected],
  );
  const cryptoInstrumentIds = cryptoSymbols.map((symbol) => {
    const normalized = symbol.trim().toUpperCase().replace("/", "_");
    return `coindcx:B-${normalized}`;
  });

  const liveCrypto = useZerionMarketStream([
    ...cryptoSymbols,
    ...cryptoInstrumentIds,
  ]);

  const load = useCallback(async () => {
    const [a, p, o] = await Promise.all([
      fetch("/api/paper/account", { cache: "no-store" }),
      fetch("/api/paper/positions", { cache: "no-store" }),
      fetch("/api/paper/orders", { cache: "no-store" }),
    ]);
    const [aj, pj, oj] = await Promise.all([a.json(), p.json(), o.json()]);
    setAccount(aj.data ?? null);
    setPositions(pj.data ?? []);
    setOrders(oj.data ?? []);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8_000);
    return () => clearInterval(timer);
  }, [load]);

  const marked = useMemo(
    () =>
      positions.map((p) => {
        const stream = liveCrypto[p.symbol];
        if (!stream) return p;
        const markPrice = stream.price;
        return {
          ...p,
          markPrice,
          unrealizedPnl: (markPrice - p.averagePrice) * p.quantity,
        };
      }),
    [positions, liveCrypto],
  );

  const open = marked.filter((item) => item.quantity !== 0);
  const unrealized = marked.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const realized = marked.reduce((sum, p) => sum + p.realizedPnl, 0);
  const exposure = marked.reduce(
    (sum, p) => sum + Math.abs(p.quantity * p.markPrice),
    0,
  );
  const displayEquity = account ? account.cashBalance + exposure + realized : 0;
  const selectedCrypto = liveCrypto[selected.symbol];

  async function place() {
    setBusy(true);
    setMessage("Checking provider quote and paper-risk rules…");
    try {
      const payload = {
        symbol: selected.symbol,
        market: selected.market,
        side,
        type,
        quantity: Number(quantity),
        limitPrice: limitPrice ? Number(limitPrice) : undefined,
        stopPrice: stopPrice ? Number(stopPrice) : undefined,
      };
      const response = await fetch("/api/paper/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      setMessage(
        response.ok
          ? `Paper order ${body.data?.order?.status ?? "accepted"}.`
          : (body.error?.message ?? "Paper order rejected"),
      );
      if (response.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  async function squareOff(position: Position) {
    if (!window.confirm(`Square off ${position.symbol}?`)) return;
    setClosing(position.id);
    setMessage("");
    try {
      const response = await fetch("/api/paper/positions/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionId: position.id }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Square off failed");
      }
      setMessage(`${position.symbol} paper position closed.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Square off failed");
    } finally {
      setClosing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [
            "Equity",
            account && `${account.currency} ${displayEquity.toLocaleString()}`,
          ],
          [
            "Cash",
            account &&
              `${account.currency} ${account.cashBalance.toLocaleString()}`,
          ],
          [
            "Paper unrealized",
            account && `${account.currency} ${unrealized.toLocaleString()}`,
          ],
          [
            "Paper realized P&L",
            account && `${account.currency} ${realized.toLocaleString()}`,
          ],
          [
            "Gross exposure",
            account && `${account.currency} ${exposure.toLocaleString()}`,
          ],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <span className="text-sm text-white/45">{label}</span>
            <strong className="mt-2 block text-xl">
              {value ?? "Loading…"}
            </strong>
          </div>
        ))}
      </div>

      <ActiveStrategyRuntime symbol={selected.symbol} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">INTERACTIVE MARKET VIEW</p>
            <h2 className="mt-1 text-xl font-semibold">{selected.label}</h2>
          </div>
          {selected.market === "crypto" && selectedCrypto ? (
            <span className="status-pill">
              <Activity className="h-3.5 w-3.5" /> Live{" "}
              {selectedCrypto.price.toLocaleString()}
            </span>
          ) : (
            <span className="data-badge">Reference chart</span>
          )}
        </div>
        <div className="min-h-[420px] overflow-hidden rounded-2xl">
          <TradingViewAdvancedChart symbol={selected.tv} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[.82fr_1.5fr]">
        <section className="panel space-y-4">
          <div className="panel-header">
            <div>
              <p className="eyebrow">PAPER ORDER</p>
              <h2 className="mt-1 text-xl font-semibold">Order ticket</h2>
            </div>
            <span className="data-badge">No real money</span>
          </div>
          <label>
            Instrument
            <select
              value={instrument}
              onChange={(e) => setInstrument(Number(e.target.value))}
            >
              {instruments.map((x, i) => (
                <option key={x.label} value={i}>
                  {x.label} · {x.market}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Side
              <select value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>
            <label>
              Order type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
                <option value="stop">Stop</option>
                <option value="stop-limit">Stop limit</option>
              </select>
            </label>
          </div>
          <label>
            Quantity
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min="0.0001"
              step="any"
            />
          </label>
          {(type === "limit" || type === "stop-limit") && (
            <label>
              Limit price
              <input
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                type="number"
              />
            </label>
          )}
          {(type === "stop" || type === "stop-limit") && (
            <label>
              Stop price
              <input
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                type="number"
              />
            </label>
          )}
          <button
            disabled={busy || !Number(quantity)}
            onClick={() => void place()}
            className="zx-primary-action w-full"
          >
            {busy ? "Checking…" : "Place paper order"}
          </button>
          {message ? <p className="text-sm text-white/60">{message}</p> : null}
          <p className="flex gap-2 text-xs text-white/40">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Provider quotes are required. Zerion does not fabricate fills.
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="text-xl font-semibold">Paper positions</h2>
            <button onClick={() => void load()} className="zx-secondary-action">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-white/45">
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Average</th>
                  <th>Mark</th>
                  <th>Unrealized</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {open.map((p) => (
                  <tr className="border-t border-white/10" key={p.id}>
                    <td className="py-3">
                      {p.symbol}
                      <small className="block text-white/40">{p.market}</small>
                    </td>
                    <td>{p.quantity}</td>
                    <td>{p.averagePrice.toLocaleString()}</td>
                    <td>{p.markPrice.toLocaleString()}</td>
                    <td
                      className={p.unrealizedPnl >= 0 ? "positive" : "negative"}
                    >
                      {p.unrealizedPnl.toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="zx-exit-action"
                        disabled={closing === p.id}
                        onClick={() => void squareOff(p)}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {closing === p.id ? "Exiting…" : "Exit"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!open.length ? (
              <p className="py-6 text-white/50">No open paper positions.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2 className="text-xl font-semibold">Paper order history</h2>
          <span className="data-badge">{orders.length}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/45">
                <th>Instrument</th>
                <th>Side</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 30).map((o) => (
                <tr className="border-t border-white/10" key={o.id}>
                  <td className="py-3">{o.symbol}</td>
                  <td>{o.side}</td>
                  <td>{o.type}</td>
                  <td>{o.quantity}</td>
                  <td>{o.status}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
