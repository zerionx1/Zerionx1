"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  authMode: "oauth" | "api-key" | "session";
  supportsSandbox: boolean;
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
  display_name?: string;
};

const marketCopy = {
  india: {
    title: "Indian Markets",
    copy: "Connect Upstox for Indian equities, indices, F&O and supported exchange segments.",
  },
  forex: {
    title: "Forex",
    copy: "Connect a cTrader account and authorize Zerion X1 for the trading accounts you choose.",
  },
  crypto: {
    title: "Crypto",
    copy: "Live crypto account connection is not enabled in this release.",
  },
} as const;

export function BrokerConnectionCenter() {
  const [catalog, setCatalog] = useState<Broker[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [market, setMarket] =
    useState<"india" | "crypto" | "forex">("india");
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
            `${broker.name} could not start account linking.`,
        );
        return;
      }

      if (json.data?.authorizationUrl) {
        window.location.assign(json.data.authorizationUrl);
        return;
      }

      setMessage(`${broker.name} account linking started.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const currentCopy = marketCopy[market];

  return (
    <div className="space-y-6">
      <section className="zx-provider-intro">
        <div>
          <p className="eyebrow">Choose where you trade</p>
          <h2>{currentCopy.title}</h2>
          <p>{currentCopy.copy}</p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="zx-secondary-action"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh status
        </button>
      </section>

      <div className="zx-market-tabs">
        {(["india", "forex", "crypto"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMarket(value)}
            className={market === value ? "is-active" : ""}
          >
            <span>
              {value === "india"
                ? "Indian Markets"
                : value === "forex"
                  ? "Forex"
                  : "Crypto"}
            </span>
            {value === "crypto" ? <small>Coming soon</small> : null}
          </button>
        ))}
      </div>

      {message ? (
        <div className="panel flex items-start gap-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--zx-bronze)]" />
          <p>{message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((broker) => {
          const connection = connectionFor(broker.key);
          const connected = connection?.status === "connected";
          const comingSoon = broker.availability === "coming-soon";

          return (
            <article className="zx-broker-card" key={broker.key}>
              <div className="zx-broker-card__top">
                <span className="x1-menu-icon">
                  {comingSoon ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Cable className="h-4 w-4" />
                  )}
                </span>

                <span className="data-badge">
                  {comingSoon
                    ? "Coming soon"
                    : connected
                      ? "Connected"
                      : broker.configured
                        ? "Ready to link"
                        : "Needs app credentials"}
                </span>
              </div>

              <h3>{broker.name}</h3>
              <p>{broker.description}</p>

              {!comingSoon ? (
                <>
                  <div className="zx-capability-row">
                    <span>Live data</span>
                    <span>Orders</span>
                    <span>Positions</span>
                    <span>Risk checks</span>
                  </div>

                  <div className="zx-broker-actions">
                    <button
                      type="button"
                      disabled={
                        busy === broker.key ||
                        connected ||
                        !broker.configured
                      }
                      onClick={() => void connect(broker)}
                      className="zx-primary-action"
                    >
                      {connected ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Account linked
                        </>
                      ) : busy === broker.key ? (
                        "Opening secure login…"
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
                        Create account
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="zx-secondary-action"
                        title="A cTrader partner/referral signup URL will be added before this action is enabled."
                      >
                        Create account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {!broker.configured ? (
                    <p className="zx-setup-note">
                      Zerion code is ready. Add the provider Client ID and
                      Client Secret on the server to enable secure linking.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="zx-coming-soon-box">
                  <strong>Research stays available.</strong>
                  <p>
                    Real crypto account linking and live execution will be
                    enabled only after the production connector is approved.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="zx-trust-strip">
        <ShieldAlert />
        <p>
          Zerion X1 never asks users to paste broker passwords or OTPs. Supported
          accounts are linked through the provider&apos;s own authorization
          screen.
        </p>
      </div>
    </div>
  );
}
