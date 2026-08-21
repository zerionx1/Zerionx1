"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bitcoin,
  Landmark,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

type Broker = "upstox" | "coindcx" | "ctrader";

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function LiveTradingCommandCenter() {
  const [broker, setBroker] =
    useState<Broker>("upstox");
  const [data, setData] =
    useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sync() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/live/account?broker=${broker}`,
        { cache: "no-store" },
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error?.message ?? "Sync failed",
        );
      }

      setData(json.data ?? {});
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Sync failed",
      );
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(() => {
    if (!data) return [];

    if (broker === "upstox") {
      const positions = (
        (data.positions as
          | { data?: unknown[] }
          | undefined)?.data ?? []
      ).length;

      const holdings = (
        (data.holdings as
          | { data?: unknown[] }
          | undefined)?.data ?? []
      ).length;

      const orders = (
        (data.orders as
          | { data?: unknown[] }
          | undefined)?.data ?? []
      ).length;

      return [
        ["Open positions", positions],
        ["Holdings", holdings],
        ["Orders today", orders],
      ];
    }

    if (broker === "coindcx") {
      const balances =
        (data.balances as
          | Array<{
              currency?: string;
              balance?: number;
              locked_balance?: number;
            }>
          | undefined) ?? [];

      const funded = balances.filter(
        (row) =>
          numberValue(row.balance) +
            numberValue(row.locked_balance) >
          0,
      );

      const availableTotal = funded.reduce(
        (sum, row) =>
          sum + numberValue(row.balance),
        0,
      );

      return [
        ["Funded assets", funded.length],
        [
          "Balance rows",
          balances.length,
        ],
        [
          "Available total*",
          availableTotal.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 4,
            },
          ),
        ],
      ];
    }

    const accounts =
      (data.accounts as unknown[] | undefined)
        ?.length ?? 0;

    return [
      ["Authorized cTrader accounts", accounts],
    ];
  }, [broker, data]);

  const brokerLabel =
    broker === "upstox"
      ? "Upstox"
      : broker === "coindcx"
        ? "CoinDCX"
        : "cTrader";

  return (
    <div className="space-y-6">
      <section className="zx-command-hero">
        <div>
          <p className="eyebrow">
            Live trading command center
          </p>
          <h1>
            Connected accounts in one clear live workspace.
          </h1>
          <p>
            Zerion reads the authorized broker state,
            keeps paper and live trading separate, and
            requires confirmation before live execution.
          </p>
        </div>

        <div
          className="zx-command-orb"
          aria-hidden="true"
        >
          <Activity />
        </div>
      </section>

      <div className="zx-switch-grid zx-live-broker-switch">
        <button
          type="button"
          className={
            broker === "upstox"
              ? "is-active"
              : ""
          }
          onClick={() => {
            setBroker("upstox");
            setData(null);
            setError("");
          }}
        >
          <Landmark />
          <span>Indian Markets</span>
          <small>Upstox</small>
        </button>

        <button
          type="button"
          className={
            broker === "coindcx"
              ? "is-active"
              : ""
          }
          onClick={() => {
            setBroker("coindcx");
            setData(null);
            setError("");
          }}
        >
          <Bitcoin />
          <span>Crypto</span>
          <small>CoinDCX</small>
        </button>

        <button
          type="button"
          className={
            broker === "ctrader"
              ? "is-active"
              : ""
          }
          onClick={() => {
            setBroker("ctrader");
            setData(null);
            setError("");
          }}
        >
          <WalletCards />
          <span>Forex</span>
          <small>cTrader</small>
        </button>
      </div>

      <section className="zx-live-panel">
        <div className="zx-live-panel__head">
          <div>
            <p className="eyebrow">
              {brokerLabel}
            </p>
            <h2>Live account state</h2>
          </div>

          <button
            className="zx-secondary-action"
            onClick={() => void sync()}
            disabled={busy}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {busy ? "Syncing…" : "Sync now"}
          </button>
        </div>

        {broker === "coindcx" ? (
          <div className="zx-live-note">
            CoinDCX sync uses the API credentials
            encrypted for the currently signed-in user.
            Zerion does not reuse a platform-wide
            CoinDCX trading key.
          </div>
        ) : null}

        {error ? (
          <div className="zx-error-banner">
            {error}
          </div>
        ) : null}

        {!data ? (
          <div className="zx-empty-state">
            <ShieldCheck />
            <h3>Ready when you are</h3>
            <p>
              Sync the linked account to load
              authorized live account information.
            </p>
          </div>
        ) : (
          <div className="zx-stat-grid">
            {summary.map(([label, value]) => (
              <article key={String(label)}>
                <span>{label}</span>
                <strong>
                  {String(value)}
                </strong>
              </article>
            ))}
          </div>
        )}

        {broker === "coindcx" && data ? (
          <p className="zx-balance-footnote">
            *The available-total tile is only a quick
            sum of numeric balance fields across
            currencies; it is not a converted INR/USD
            portfolio valuation.
          </p>
        ) : null}
      </section>

      <div className="zx-trust-strip">
        <ShieldCheck />
        <p>
          Paper P&amp;L and live P&amp;L remain
          separate. A signal does not become a live
          order until the user confirms the final
          proposal.
        </p>
      </div>
    </div>
  );
}
