"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cable, CheckCircle2, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";

type Broker = {
  key: string;
  name: string;
  kind: "india" | "crypto" | "forex";
  authMode: "oauth" | "api-key" | "session";
  supportsSandbox: boolean;
  capabilities: {
    marketData: boolean;
    orders: boolean;
    positions: boolean;
    funds: boolean;
    websocket: boolean;
  };
};

type Connection = {
  id: string;
  broker_key?: string;
  brokerKey?: string;
  status?: string;
  display_name?: string;
};

export function BrokerConnectionCenter() {
  const [catalog, setCatalog] = useState<Broker[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [market, setMarket] = useState<"india" | "crypto" | "forex">("india");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/brokers", { cache: "no-store" });
    const json = await response.json();
    setCatalog(json.data?.catalog ?? []);
    setConnections(json.data?.connections ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => catalog.filter((broker) => broker.kind === market),
    [catalog, market],
  );

  function connectionFor(key: string) {
    return connections.find(
      (item) => (item.broker_key ?? item.brokerKey) === key,
    );
  }

  async function connect(broker: Broker) {
    setBusy(broker.key);
    setMessage("");
    try {
      const response = await fetch("/api/brokers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brokerKey: broker.key }),
      });
      const json = await response.json();

      if (!response.ok) {
        setMessage(
          json.error?.message ??
            `${broker.name} is not configured on the server yet.`,
        );
        return;
      }

      if (json.data?.authorizationUrl) {
        window.location.assign(json.data.authorizationUrl);
        return;
      }

      setMessage(`${broker.name} authorization started.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["india", "crypto", "forex"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMarket(value)}
            className={market === value ? "zx-primary-action" : "zx-secondary-action"}
          >
            {value === "india" ? "Indian Markets" : value === "crypto" ? "Crypto" : "Forex / FX"}
          </button>
        ))}
        <button type="button" onClick={() => void load()} className="zx-secondary-action ml-auto">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </button>
      </div>

      {message ? (
        <div className="panel flex items-start gap-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--zx-stone)]" />
          <p>{message}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((broker) => {
          const connection = connectionFor(broker.key);
          const connected = connection?.status === "connected";

          return (
            <article className="panel" key={broker.key}>
              <div className="flex items-start justify-between gap-3">
                <span className="x1-menu-icon"><Cable className="h-4 w-4" /></span>
                <span className="data-badge">
                  {connected ? "Connected" : broker.authMode}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold">{broker.name}</h3>
              <p className="mt-2 text-sm text-white/50">
                {broker.capabilities.marketData ? "Market data" : "No data"} ·{" "}
                {broker.capabilities.orders ? "Orders" : "Read only"} ·{" "}
                {broker.capabilities.websocket ? "Streaming" : "REST"}
              </p>

              <p className="mt-3 text-xs text-white/40">
                {broker.supportsSandbox
                  ? "Sandbox/demo path supported by this adapter."
                  : "Production credentials/account may be required."}
              </p>

              <button
                type="button"
                disabled={busy === broker.key || connected}
                onClick={() => void connect(broker)}
                className="zx-primary-action mt-5 w-full"
              >
                {connected ? (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Connected</>
                ) : busy === broker.key ? (
                  "Starting…"
                ) : (
                  <><ExternalLink className="mr-2 h-4 w-4" /> Connect</>
                )}
              </button>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-white/40">
        MetaTrader 4/5 are integration bridges, not universal brokers. A compatible broker/terminal and server-side bridge are still required for live execution.
      </p>
    </div>
  );
}
