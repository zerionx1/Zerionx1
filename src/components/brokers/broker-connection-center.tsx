"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Cable,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

type Broker = {
  key: string;
  name: string;
  kind: "india" | "crypto" | "forex";
  availability?: "available" | "coming-soon";
  description?: string;
  createAccountUrl?: string;
  configured?: boolean;
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
};
type Status = Record<
  string,
  {
    configured: boolean;
    clientId?: boolean;
    clientSecret?: boolean;
    redirectUri?: boolean;
    apiKey?: boolean;
    apiSecret?: boolean;
    encryptionKey: boolean;
  }
>;

const marketCopy = {
  india: {
    title: "Indian Markets",
    copy: "Connect Upstox for equities, indices, futures and options.",
  },
  forex: {
    title: "Forex",
    copy: "MT5 Bridge integration is the next live Forex connector.",
  },
  crypto: {
    title: "Crypto",
    copy: "Connect CoinDCX for live crypto market data, candles, wallet balances and account events.",
  },
} as const;

export function BrokerConnectionCenter() {
  const [catalog, setCatalog] = useState<Broker[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [status, setStatus] = useState<Status>({});
  const [market, setMarket] = useState<"india" | "crypto" | "forex">("india");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/brokers", { cache: "no-store" }),
      fetch("/api/brokers/config-status", { cache: "no-store" }),
    ]);
    const [aj, bj] = await Promise.all([a.json(), b.json()]);
    setCatalog(aj.data?.catalog ?? []);
    setConnections(aj.data?.connections ?? []);
    setStatus(bj.data ?? {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => catalog.filter((x) => x.kind === market),
    [catalog, market],
  );
  const connectionFor = (key: string) =>
    connections.find((x) => (x.broker_key ?? x.brokerKey) === key);

  async function connect(broker: Broker) {
    setBusy(broker.key);
    setMessage("");
    try {
      const r = await fetch("/api/brokers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brokerKey: broker.key }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(
          j.error?.message ?? `${broker.name} could not start linking.`,
        );
        return;
      }
      if (j.data?.authorizationUrl) {
        window.location.assign(j.data.authorizationUrl);
        return;
      }
      setMessage(`${broker.name} connected successfully.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(broker: Broker, connection: Connection) {
    if (!window.confirm(`Disconnect ${broker.name} from Zerion X1?`)) return;

    setBusy(broker.key);
    setMessage("");

    try {
      const r = await fetch(
        `/api/brokers?id=${encodeURIComponent(connection.id)}`,
        { method: "DELETE" },
      );
      const j = await r.json();

      if (!r.ok) {
        setMessage(
          j.error?.message ?? `${broker.name} could not be disconnected.`,
        );
        return;
      }

      setMessage(`${broker.name} disconnected successfully.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const current = marketCopy[market];

  return (
    <div className="space-y-6">
      <section className="zx-provider-intro">
        <div>
          <p className="eyebrow">CHOOSE WHERE YOU TRADE</p>
          <h2>{current.title}</h2>
          <p>{current.copy}</p>
        </div>
        <button onClick={() => void load()} className="zx-secondary-action">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh status
        </button>
      </section>

      <div className="zx-market-tabs">
        {(["india", "forex", "crypto"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMarket(v)}
            className={market === v ? "is-active" : ""}
          >
            <span>
              {v === "india"
                ? "Indian Markets"
                : v === "forex"
                  ? "Forex"
                  : "Crypto"}
            </span>
            {v === "forex" ? <small>Coming soon</small> : null}
          </button>
        ))}
      </div>

      {message ? (
        <div className="panel flex gap-3 text-sm">
          <ShieldAlert className="h-4 w-4" />
          <p>{message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((broker) => {
          const connection = connectionFor(broker.key);
          const connected = connection?.status === "connected";
          const coming = broker.availability === "coming-soon";
          const server = status[broker.key];
          const configured = server?.configured ?? broker.configured ?? false;

          return (
            <article className="zx-broker-card" key={broker.key}>
              <div className="zx-broker-card__top">
                <span className="x1-menu-icon">
                  {coming ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Cable className="h-4 w-4" />
                  )}
                </span>
                <span className="data-badge">
                  {coming
                    ? "Coming soon"
                    : connected
                      ? "Connected"
                      : configured
                        ? "Credentials detected"
                        : "Credentials missing on deployed server"}
                </span>
              </div>

              <h3>{broker.name}</h3>
              <p>{broker.description}</p>

              {!coming ? (
                <>
                  <div className="zx-capability-row">
                    <span>Live data</span>
                    <span>Orders</span>
                    <span>Positions</span>
                    <span>Risk checks</span>
                    {broker.key === "upstox" ? <span>F&amp;O</span> : null}
                    {broker.key === "coindcx" ? <span>Crypto</span> : null}
                  </div>

                  <div className="zx-broker-actions">
                    {connected && connection ? (
                      <>
                        <button disabled className="zx-primary-action">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Account linked
                        </button>
                        <button
                          disabled={busy === broker.key}
                          onClick={() => void disconnect(broker, connection)}
                          className="zx-secondary-action"
                        >
                          {busy === broker.key
                            ? "Disconnecting…"
                            : "Disconnect account"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          disabled={busy === broker.key || !configured}
                          onClick={() => void connect(broker)}
                          className="zx-primary-action"
                        >
                          {busy === broker.key ? (
                            "Connecting securely…"
                          ) : (
                            <>
                              <LockKeyhole className="mr-2 h-4 w-4" />
                              Link existing account
                            </>
                          )}
                        </button>

                        {broker.createAccountUrl ? (
                          <a
                            href={broker.createAccountUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="zx-secondary-action"
                          >
                            Create account{" "}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        ) : (
                          <button disabled className="zx-secondary-action">
                            Create account{" "}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {!configured ? (
                    <div className="zx19-credential-diagnostic">
                      <strong>Deployment credentials are incomplete.</strong>
                      <p>
                        Add the provider variables to Vercel and Render, then
                        redeploy before connecting the account.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="zx-coming-soon-box">
                  <strong>Coming soon.</strong>
                  <p>This provider is not enabled for live linking yet.</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
