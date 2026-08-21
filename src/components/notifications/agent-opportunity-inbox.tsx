"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  directionOf,
  displayNumber,
  expiryOf,
  isOpportunityExpired,
} from "@/lib/notifications/opportunity-display";

type NotificationRow = {
  id: string;
  opportunity_id?: string | null;
  title: string;
  body: string;
  kind?: string;
  priority: string;
  read_at?: string | null;
  created_at: string;
  action_url?: string | null;
  event_data?: Record<string, unknown> | null;
};

type Deployment = {
  id: string;
  name?: string;
  symbol?: string;
  mode?: string;
};

export function AgentOpportunityInbox() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(Date.now());

  const load = useCallback(async () => {
    const [notificationsResponse, deploymentsResponse] =
      await Promise.all([
        fetch("/api/notifications/inbox", { cache: "no-store" }),
        fetch("/api/algo/deployments", { cache: "no-store" }),
      ]);

    const notificationsJson = await notificationsResponse
      .json()
      .catch(() => ({}));
    const deploymentsJson = await deploymentsResponse
      .json()
      .catch(() => ({}));

    setRows(notificationsJson.data?.notifications ?? []);
    setDeployments(deploymentsJson.data?.deployments ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock(Date.now()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  async function approve(row: NotificationRow) {
    if (!row.opportunity_id) return;

    const data = row.event_data ?? {};

    if (isOpportunityExpired(data, Date.now())) {
      setMessage(
        "This opportunity has expired. Refresh for a fresh setup.",
      );
      return;
    }

    const deploymentId = selected[row.id];
    if (!deploymentId) {
      setMessage(
        "Select a strategy deployment before approving this opportunity.",
      );
      return;
    }

    const side = directionOf(data) || "TRADE";
    const symbol = String(data.symbol ?? row.title);

    if (
      !window.confirm(
        `Approve ${side} ${symbol}? Zerion will re-check expiry, broker state and execution policy.`,
      )
    )
      return;

    setBusy(row.id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/agents/opportunities/${encodeURIComponent(
          row.opportunity_id,
        )}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            deploymentId,
            confirmed: true,
          }),
        },
      );

      const json = await response.json().catch(() => ({}));

      setMessage(
        response.ok
          ? json.data?.message ?? "Opportunity approved."
          : json.error?.message ?? "Approval failed.",
      );

      if (response.ok) {
        await fetch("/api/notifications/inbox", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: row.id }),
        });

        const nextUrl = json.data?.nextAction?.url;
        if (typeof nextUrl === "string" && nextUrl) {
          window.location.href = nextUrl;
        } else {
          await load();
        }
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="x1-menu-group zx-agent-inbox">
      <div className="x1-panel-heading">
        <div>
          <span className="x1-kicker">
            ZERION INTELLIGENCE
          </span>
          <h3>Notifications & trade opportunities</h3>
          <p>
            Every setup shows direction, risk, targets and
            expiry before approval.
          </p>
        </div>
        <button
          className="zx-secondary-action"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {message ? (
        <div className="zx-agent-message">{message}</div>
      ) : null}

      <div className="zx-agent-notification-list">
        {rows.map((row) => {
          const data = row.event_data ?? {};
          const side = directionOf(data);
          const expiresAt = expiryOf(data);
          const expired = row.opportunity_id
            ? isOpportunityExpired(data, clock)
            : false;
          const remaining =
            expiresAt === null
              ? null
              : Math.max(0, expiresAt - clock);

          const SideIcon =
            side === "SELL" || side === "SHORT"
              ? TrendingDown
              : TrendingUp;

          return (
            <article
              key={row.id}
              className={`${
                row.read_at
                  ? "zx-agent-notification"
                  : "zx-agent-notification is-unread"
              } ${expired ? "is-expired" : ""}`}
            >
              <div className="zx-agent-notification__icon">
                {row.opportunity_id ? <SideIcon /> : <BellRing />}
              </div>

              <div className="zx-agent-notification__body">
                <div className="zx-agent-notification__title">
                  <strong>{row.title}</strong>
                  <span className="data-badge">
                    {row.priority}
                  </span>
                </div>

                <p>{row.body}</p>

                {row.opportunity_id ? (
                  <>
                    <div className="zx-trade-grid">
                      <div>
                        <small>Side</small>
                        <strong
                          className={
                            side === "SELL" || side === "SHORT"
                              ? "zx-sell-text"
                              : "zx-buy-text"
                          }
                        >
                          {side || "—"}
                        </strong>
                      </div>
                      <div>
                        <small>Entry</small>
                        <strong>
                          {displayNumber(
                            data.entry ??
                              data.entryPrice ??
                              data.price,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Quantity</small>
                        <strong>
                          {displayNumber(
                            data.quantity ?? data.qty,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Stop loss</small>
                        <strong>
                          {displayNumber(
                            data.stopLoss ?? data.sl,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Target</small>
                        <strong>
                          {displayNumber(
                            data.target ??
                              data.takeProfit ??
                              data.tp,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Max risk</small>
                        <strong>
                          {displayNumber(
                            data.maxRisk ?? data.risk,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>R:R</small>
                        <strong>
                          {displayNumber(
                            data.riskReward ?? data.rr,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Trailing</small>
                        <strong>
                          {String(
                            data.trailing ??
                              data.trailingRule ??
                              "Configured",
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      className={`zx-expiry ${
                        expired ? "is-expired" : ""
                      }`}
                    >
                      {expired ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}

                      {expired
                        ? "Opportunity expired"
                        : remaining === null
                          ? "Expiry controlled by Zerion"
                          : `Expires in ${Math.floor(
                              remaining / 60000,
                            )}m ${Math.floor(
                              (remaining % 60000) / 1000,
                            )}s`}
                    </div>
                  </>
                ) : null}

                <small>
                  {new Date(row.created_at).toLocaleString()}
                </small>
              </div>

              {row.opportunity_id ? (
                <div className="zx-agent-notification__actions">
                  <select
                    disabled={expired}
                    value={selected[row.id] ?? ""}
                    onChange={(event) =>
                      setSelected((value) => ({
                        ...value,
                        [row.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">
                      Select deployment
                    </option>
                    {deployments.map((deployment) => (
                      <option
                        key={deployment.id}
                        value={deployment.id}
                      >
                        {deployment.name ??
                          deployment.symbol ??
                          deployment.id}{" "}
                        · {deployment.mode ?? "mode"}
                      </option>
                    ))}
                  </select>

                  <button
                    className="zx-primary-action"
                    disabled={expired || busy === row.id}
                    onClick={() => void approve(row)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {expired
                      ? "Expired"
                      : busy === row.id
                        ? "Approving…"
                        : "Approve trade"}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}

        {!rows.length ? (
          <div className="zx-agent-empty">
            No notifications yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}
