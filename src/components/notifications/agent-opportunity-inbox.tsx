"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, RefreshCw } from "lucide-react";

type NotificationRow = {
  id: string;
  opportunity_id?: string | null;
  title: string;
  body: string;
  priority: string;
  read_at?: string | null;
  created_at: string;
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

  const load = useCallback(async () => {
    const [notificationsResponse, deploymentsResponse] = await Promise.all([
      fetch("/api/notifications/inbox", { cache: "no-store" }),
      fetch("/api/algo/deployments", { cache: "no-store" }),
    ]);

    const notificationsJson = await notificationsResponse.json().catch(() => ({}));
    const deploymentsJson = await deploymentsResponse.json().catch(() => ({}));

    setRows(notificationsJson.data?.notifications ?? []);
    setDeployments(deploymentsJson.data?.deployments ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(row: NotificationRow) {
    if (!row.opportunity_id) return;
    const deploymentId = selected[row.id];
    if (!deploymentId) {
      setMessage("Select a strategy deployment before approving this opportunity.");
      return;
    }

    if (
      !window.confirm(
        "Approve this opportunity for the selected deployment? This records approval only; Zerion still applies execution policy, broker checks and risk preflight.",
      )
    )
      return;

    setBusy(row.id);
    setMessage("");
    try {
      const response = await fetch(
        `/api/agents/opportunities/${encodeURIComponent(row.opportunity_id)}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deploymentId, confirmed: true }),
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
        await load();
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="x1-menu-group zx-agent-inbox">
      <div className="x1-panel-heading">
        <div>
          <span className="x1-kicker">ZERION INTELLIGENCE</span>
          <h3>Market opportunities</h3>
          <p>
            Agent findings are proposals only. A broker order is never placed from
            this screen without the existing execution gates.
          </p>
        </div>
        <button className="zx-secondary-action" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {message ? <div className="zx-agent-message">{message}</div> : null}

      <div className="zx-agent-notification-list">
        {rows.map((row) => (
          <article
            key={row.id}
            className={row.read_at ? "zx-agent-notification" : "zx-agent-notification is-unread"}
          >
            <div className="zx-agent-notification__icon">
              <BellRing />
            </div>
            <div className="zx-agent-notification__body">
              <div className="zx-agent-notification__title">
                <strong>{row.title}</strong>
                <span className="data-badge">{row.priority}</span>
              </div>
              <p>{row.body}</p>
              <small>{new Date(row.created_at).toLocaleString()}</small>
            </div>

            {row.opportunity_id ? (
              <div className="zx-agent-notification__actions">
                <select
                  value={selected[row.id] ?? ""}
                  onChange={(event) =>
                    setSelected((value) => ({
                      ...value,
                      [row.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Select deployment</option>
                  {deployments.map((deployment) => (
                    <option key={deployment.id} value={deployment.id}>
                      {deployment.name ?? deployment.symbol ?? deployment.id} ·{" "}
                      {deployment.mode ?? "mode"}
                    </option>
                  ))}
                </select>
                <button
                  className="zx-primary-action"
                  disabled={busy === row.id}
                  onClick={() => void approve(row)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {busy === row.id ? "Approving…" : "Approve"}
                </button>
              </div>
            ) : null}
          </article>
        ))}

        {!rows.length ? (
          <div className="zx-agent-empty">
            No active agent opportunity notifications yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}
