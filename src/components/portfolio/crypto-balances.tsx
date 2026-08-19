"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Balance = {
  currency: string;
  balance: number;
  locked_balance: number;
};

export function CryptoBalances() {
  const [state, setState] = useState<
    { connected: boolean; balances: Balance[] } | undefined
  >(undefined);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/crypto/account", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => {
        if (mounted) setState(body.data ?? { connected: false, balances: [] });
      })
      .catch(() => {
        if (mounted) setState({ connected: false, balances: [] });
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!state) {
    return <Card><h3>CoinDCX wallet</h3><p>Syncing…</p></Card>;
  }

  if (!state.connected) {
    return (
      <Card>
        <h3>CoinDCX wallet</h3>
        <p>Connect CoinDCX from Trading Connections to sync crypto balances.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3>CoinDCX wallet</h3>
      {state.balances.length === 0 ? (
        <p className="mt-3">Connected. No non-zero balances found.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {state.balances.slice(0, 30).map((row) => (
            <div
              key={row.currency}
              className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-2xl border border-white/10 p-3"
            >
              <strong>{row.currency}</strong>
              <span>{Number(row.balance).toLocaleString()}</span>
              <span className="opacity-60">
                Locked {Number(row.locked_balance).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
