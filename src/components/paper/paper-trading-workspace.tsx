"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ShieldCheck } from "lucide-react";
import { TradingViewAdvancedChart } from "@/components/markets/tradingview-advanced-chart";
import { useBinanceMarketStream } from "@/hooks/use-binance-market-stream";

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
  averageFillPrice?: number;
  createdAt: string;
};

const instruments = [
  { label: "BTC/USDT", symbol: "BTC/USDT", market: "crypto", tv: "BINANCE:BTCUSDT" },
  { label: "ETH/USDT", symbol: "ETH/USDT", market: "crypto", tv: "BINANCE:ETHUSDT" },
  { label: "NIFTY 50", symbol: "NSE:NIFTY50", market: "indian-index", tv: "NSE:NIFTY" },
  { label: "BANK NIFTY", symbol: "NSE:BANKNIFTY", market: "indian-index", tv: "NSE:BANKNIFTY" },
  { label: "RELIANCE", symbol: "NSE:RELIANCE", market: "indian-equity", tv: "NSE:RELIANCE" },
  { label: "EUR/USD", symbol: "EUR/USD", market: "forex", tv: "FX:EURUSD" },
  { label: "XAU/USD", symbol: "XAU/USD", market: "forex", tv: "OANDA:XAUUSD" },
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

  const selected = instruments[instrument]!;
  const cryptoSymbols = useMemo(
    () =>
      Array.from(
        new Set([
          ...positions.filter((p) => p.market === "crypto").map((p) => p.symbol),
          ...(selected.market === "crypto" ? [selected.symbol] : []),
        ]),
      ),
    [positions, selected],
  );
  const liveCrypto = useBinanceMarketStream(cryptoSymbols);

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
    return () => window.clearInterval(timer);
  }, [load]);

  const markedPositions = useMemo(
    () =>
      positions.map((position) => {
        const stream = liveCrypto[position.symbol];
        if (!stream) return position;
        const markPrice = stream.price;
        return {
          ...position,
          markPrice,
          unrealizedPnl: (markPrice - position.averagePrice) * position.quantity,
        };
      }),
    [positions, liveCrypto],
  );

  const unrealized = useMemo(
    () => markedPositions.reduce((sum, position) => sum + position.unrealizedPnl, 0),
    [markedPositions],
  );
  const realized = useMemo(
    () => markedPositions.reduce((sum, position) => sum + position.realizedPnl, 0),
    [markedPositions],
  );
  const exposure = useMemo(
    () => markedPositions.reduce((sum, position) => sum + Math.abs(position.quantity * position.markPrice), 0),
    [markedPositions],
  );
  const displayEquity = account ? account.cashBalance + exposure + realized : 0;
  const selectedCrypto = liveCrypto[selected.symbol];

  async function place() {
    setBusy(true);
    setMessage("Validating quote, buying power and paper-risk limits…");
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
      const json = await response.json();
      setMessage(
        response.ok
          ? `Paper order ${json.data?.order?.status ?? "accepted"}.`
          : json.error?.message ?? "Paper order rejected",
      );
      if (response.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Equity", account && `${account.currency} ${displayEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
          ["Cash", account && `${account.currency} ${account.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
          ["Live unrealized", account && `${account.currency} ${unrealized.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
          ["Realized P&L", account && `${account.currency} ${realized.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
          ["Gross exposure", account && `${account.currency} ${exposure.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <span className="text-sm text-white/45">{label}</span>
            <strong className="mt-2 block text-xl">{value ?? "Loading…"}</strong>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Interactive market view</p>
            <h2 className="mt-1 text-xl font-semibold">{selected.label}</h2>
          </div>
          <div className="flex gap-2">
            {selected.market === "crypto" && selectedCrypto ? (
              <span className="status-pill inline-flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" />
                Live {selectedCrypto.price.toLocaleString()}
              </span>
            ) : (
              <span className="data-badge">Chart by TradingView</span>
            )}
          </div>
        </div>
        <TradingViewAdvancedChart symbol={selected.tv} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[.82fr_1.5fr]">
        <section className="panel space-y-4">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Provider-priced simulation</p>
              <h2 className="mt-1 text-xl font-semibold">Order ticket</h2>
            </div>
            <span className="data-badge">No real money</span>
          </div>

          <label>
            Instrument
            <select value={instrument} onChange={(e) => setInstrument(Number(e.target.value))}>
              {instruments.map((item, index) => (
                <option key={item.label} value={index}>{item.label} · {item.market}</option>
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
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0.0001" step="any" />
          </label>

          {(type === "limit" || type === "stop-limit") && (
            <label>
              Limit price
              <input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} type="number" min="0" step="any" />
            </label>
          )}

          {(type === "stop" || type === "stop-limit") && (
            <label>
              Stop price
              <input value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} type="number" min="0" step="any" />
            </label>
          )}

          <button disabled={busy || !Number(quantity)} onClick={() => void place()} className="zx-primary-action w-full">
            {busy ? "Validating…" : "Place paper order"}
          </button>

          {message ? <p className="text-sm text-white/60">{message}</p> : null}

          <p className="flex gap-2 text-xs text-white/40">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Crypto BTC/ETH can use public Binance prices. Indian and FX paper execution requires a configured live provider; Zerion will not invent a synthetic fill.
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="text-xl font-semibold">Open positions</h2>
            <button type="button" onClick={() => void load()} className="zx-secondary-action">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-white/45">
                  <th>Symbol</th><th>Qty</th><th>Average</th><th>Mark</th><th>Unrealized</th>
                </tr>
              </thead>
              <tbody>
                {markedPositions.map((position) => (
                  <tr className="border-t border-white/10" key={position.id}>
                    <td className="py-3">{position.symbol}<small className="block text-white/40">{position.market}</small></td>
                    <td>{position.quantity}</td>
                    <td>{position.averagePrice.toLocaleString()}</td>
                    <td>{position.markPrice.toLocaleString()}</td>
                    <td className={position.unrealizedPnl >= 0 ? "positive" : "negative"}>
                      {position.unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {markedPositions.length === 0 ? <p className="py-6 text-white/50">No open positions.</p> : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2 className="text-xl font-semibold">Order history</h2>
          <span className="data-badge">{orders.length}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/45">
                <th>Instrument</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 30).map((order) => (
                <tr className="border-t border-white/10" key={order.id}>
                  <td className="py-3">{order.symbol}</td>
                  <td>{order.side}</td>
                  <td>{order.type}</td>
                  <td>{order.quantity}</td>
                  <td>{order.status}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
