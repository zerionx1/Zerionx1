"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Cable,
  CheckCircle2,
  ExternalLink,
  KeyRound,
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
    encryptionKey?: boolean;
    authMode?: string;
    userCredentialsRequired?: boolean;
  }
>;

const marketCopy = {
  india: {
    title: "Indian Markets",
    copy: "Upstox uses its official OAuth login. Zerion never asks you to type your Upstox password or OTP into Zerion.",
  },
  forex: {
    title: "Forex",
    copy: "Forex bridge integration is handled separately and is not enabled in this pack.",
  },
  crypto: {
    title: "Crypto",
    copy: "CoinDCX live account access uses your own CoinDCX API Key and API Secret. Enter them once; Zerion verifies and encrypts them.",
  },
} as const;

export function BrokerConnectionCenter() {
  const [catalog, setCatalog] = useState<Broker[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [status, setStatus] = useState<Status>({});
  const [market, setMarket] =
    useState<"india" | "crypto" | "forex">("india");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [coinDcxApiKey, setCoinDcxApiKey] = useState("");
  const [coinDcxApiSecret, setCoinDcxApiSecret] = useState("");

  const load = useCallback(async () => {
    const [catalogResponse, statusResponse] = await Promise.all([
      fetch("/api/brokers", { cache: "no-store" }),
      fetch("/api/brokers/config-status", { cache: "no-store" }),
    ]);

    const [catalogJson, statusJson] = await Promise.all([
      catalogResponse.json(),
      statusResponse.json(),
    ]);

    setCatalog(catalogJson.data?.catalog ?? []);
    setConnections(catalogJson.data?.connections ?? []);
    setStatus(statusJson.data ?? {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => catalog.filter((item) => item.kind === market),
    [catalog, market],
  );

  const connectionFor = (key: string) =>
    connections.find(
      (item) =>
        (item.broker_key ?? item.brokerKey) === key,
    );

  async function connect(broker: Broker) {
    setBusy(broker.key);
    setMessage("");

    try {
      const payload =
        broker.key === "coindcx"
          ? {
              brokerKey: broker.key,
              apiKey: coinDcxApiKey.trim(),
              apiSecret: coinDcxApiSecret.trim(),
            }
          : { brokerKey: broker.key };

      if (
        broker.key === "coindcx" &&
        (!payload.apiKey || !payload.apiSecret)
      ) {
        setMessage(
          "Enter your CoinDCX API Key and API Secret first.",
        );
        return;
      }

      const response = await fetch("/api/brokers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage(
          json.error?.message ??
            `${broker.name} could not start linking.`,
        );
        return;
      }

      if (json.data?.authorizationUrl) {
        window.location.assign(
          json.data.authorizationUrl,
        );
        return;
      }

      if (broker.key === "coindcx") {
        setCoinDcxApiKey("");
        setCoinDcxApiSecret("");
      }

      setMessage(
        `${broker.name} connected successfully.`,
      );
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(
    broker: Broker,
    connection: Connection,
  ) {
    if (
      !window.confirm(
        `Disconnect ${broker.name} from Zerion X1?`,
      )
    ) {
      return;
    }

    setBusy(broker.key);
    setMessage("");

    try {
      const response = await fetch(
        `/api/brokers?id=${encodeURIComponent(
          connection.id,
        )}`,
        { method: "DELETE" },
      );
      const json = await response.json();

      if (!response.ok) {
        setMessage(
          json.error?.message ??
            `${broker.name} could not be disconnected.`,
        );
        return;
      }

      setMessage(
        `${broker.name} disconnected successfully.`,
      );
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

        <button
          onClick={() => void load()}
          className="zx-secondary-action"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh status
        </button>
      </section>

      <div className="zx-market-tabs">
        {(["india", "forex", "crypto"] as const).map(
          (value) => (
            <button
              key={value}
              onClick={() => setMarket(value)}
              className={
                market === value ? "is-active" : ""
              }
            >
              <span>
                {value === "india"
                  ? "Indian Markets"
                  : value === "forex"
                    ? "Forex"
                    : "Crypto"}
              </span>
              {value === "forex" ? (
                <small>Coming soon</small>
              ) : null}
            </button>
          ),
        )}
      </div>

      {message ? (
        <div className="zx-final-message">
          <ShieldAlert className="h-4 w-4" />
          <p>{message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((broker) => {
          const connection = connectionFor(broker.key);
          const connected =
            connection?.status === "connected";
          const coming =
            broker.availability === "coming-soon";
          const server = status[broker.key];
          const configured =
            server?.configured ??
            broker.configured ??
            false;

          return (
            <article
              className="zx-broker-card"
              key={broker.key}
            >
              <div className="zx-broker-card__top">
                <span className="x1-menu-icon">
                  {coming ? (
                    <Sparkles className="h-4 w-4" />
                  ) : broker.key === "coindcx" ? (
                    <KeyRound className="h-4 w-4" />
                  ) : (
                    <Cable className="h-4 w-4" />
                  )}
                </span>

                <span className="data-badge">
                  {coming
                    ? "Coming soon"
                    : connected
                      ? "Connected"
                      : broker.key === "coindcx"
                        ? "Your API credentials"
                        : configured
                          ? "OAuth ready"
                          : "Deployment config missing"}
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
                    {broker.key === "upstox" ? (
                      <span>F&amp;O</span>
                    ) : null}
                    {broker.key === "coindcx" ? (
                      <span>Crypto</span>
                    ) : null}
                  </div>

                  {broker.key === "coindcx" &&
                  !connected ? (
                    <div className="zx-coindcx-connect">
                      <div className="zx-auth-explainer">
                        <LockKeyhole className="h-5 w-5" />
                        <div>
                          <strong>
                            CoinDCX does not use Zerion OTP.
                          </strong>
                          <p>
                            Generate an API Key and API Secret
                            inside your own CoinDCX account,
                            then paste them here once. Zerion
                            verifies them and stores only an
                            encrypted envelope.
                          </p>
                        </div>
                      </div>

                      <label>
                        <span>CoinDCX API Key</span>
                        <input
                          autoComplete="off"
                          value={coinDcxApiKey}
                          onChange={(event) =>
                            setCoinDcxApiKey(
                              event.target.value,
                            )
                          }
                          placeholder="Paste your API Key"
                        />
                      </label>

                      <label>
                        <span>CoinDCX API Secret</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={coinDcxApiSecret}
                          onChange={(event) =>
                            setCoinDcxApiSecret(
                              event.target.value,
                            )
                          }
                          placeholder="Paste your API Secret"
                        />
                      </label>
                    </div>
                  ) : null}

                  {broker.key === "upstox" &&
                  !connected ? (
                    <div className="zx-auth-explainer">
                      <LockKeyhole className="h-5 w-5" />
                      <div>
                        <strong>
                          Official Upstox OAuth
                        </strong>
                        <p>
                          Zerion redirects you to Upstox.
                          Login/OTP happens on Upstox, not
                          inside Zerion.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="zx-broker-actions">
                    {connected && connection ? (
                      <>
                        <button
                          disabled
                          className="zx-primary-action"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Account linked
                        </button>

                        <button
                          disabled={
                            busy === broker.key
                          }
                          onClick={() =>
                            void disconnect(
                              broker,
                              connection,
                            )
                          }
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
                          disabled={
                            busy === broker.key ||
                            !configured
                          }
                          onClick={() =>
                            void connect(broker)
                          }
                          className="zx-primary-action"
                        >
                          {busy === broker.key
                            ? "Connecting securely…"
                            : broker.key === "coindcx"
                              ? "Verify & connect CoinDCX"
                              : "Continue to secure login"}
                        </button>

                        {broker.createAccountUrl ? (
                          <a
                            href={
                              broker.createAccountUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="zx-secondary-action"
                          >
                            Create account
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        ) : (
                          <button
                            disabled
                            className="zx-secondary-action"
                          >
                            Create account
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {!configured ? (
                    <div className="zx19-credential-diagnostic">
                      <strong>
                        Deployment configuration is
                        incomplete.
                      </strong>
                      <p>
                        {broker.key === "coindcx"
                          ? "Only BROKER_TOKEN_ENCRYPTION_KEY is required on the server. Every user supplies their own CoinDCX API credentials."
                          : "Add the provider application variables to Vercel/Render and redeploy."}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="zx-coming-soon-box">
                  <strong>Coming soon.</strong>
                  <p>
                    This provider is not enabled for live
                    linking yet.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
