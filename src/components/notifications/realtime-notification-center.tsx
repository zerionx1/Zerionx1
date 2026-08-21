"use client";

import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  priority?: string;
  action_url?: string | null;
  event_data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
};

function iconFor(row: NotificationRow) {
  const side = String(
    row.event_data?.direction ?? row.event_data?.side ?? "",
  ).toLowerCase();

  if (side === "buy" || side === "long") return TrendingUp;
  if (side === "sell" || side === "short") return TrendingDown;
  if (row.kind.includes("feed") || row.kind.includes("disconnect"))
    return ShieldAlert;
  if (row.kind.includes("order")) return CheckCircle2;
  return BellRing;
}

function toneFor(row: NotificationRow) {
  const side = String(
    row.event_data?.direction ?? row.event_data?.side ?? "",
  ).toLowerCase();

  if (side === "buy" || side === "long") return "is-buy";
  if (side === "sell" || side === "short") return "is-sell";
  if (
    row.kind.includes("feed") ||
    row.kind.includes("disconnect") ||
    row.priority === "high"
  )
    return "is-danger";

  return "is-info";
}

export function RealtimeNotificationCenter() {
  const [toast, setToast] = useState<NotificationRow | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const seen = useRef(new Set<string>());
  const initial = useRef(true);

  const unread = useMemo(
    () => rows.filter((row) => !row.read_at).length,
    [rows],
  );

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications/inbox", {
      cache: "no-store",
    });
    if (!response.ok) return;

    const body = await response.json();
    const next = (body.data?.notifications ?? []) as NotificationRow[];
    setRows(next);

    if (initial.current) {
      next.forEach((row) => seen.current.add(row.id));
      initial.current = false;
      return;
    }

    const fresh = next.find((row) => !seen.current.has(row.id));
    next.forEach((row) => seen.current.add(row.id));
    if (fresh) setToast(fresh);
  }, []);

  const markRead = useCallback(async (id: string) => {
    await fetch("/api/notifications/inbox", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});

    setRows((value) =>
      value.map((row) =>
        row.id === id
          ? { ...row, read_at: new Date().toISOString() }
          : row,
      ),
    );
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const ToastIcon = toast ? iconFor(toast) : Bell;

  return (
    <>
      <div className="zx-notification-dock">
        <button
          type="button"
          className="zx-notification-bell"
          aria-label="Open notifications"
          onClick={() => setOpen((value) => !value)}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="zx-notification-count">
              {Math.min(unread, 99)}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="zx-notification-popover">
            <div className="zx-notification-popover__head">
              <div>
                <strong>Notifications</strong>
                <small>
                  {unread ? `${unread} unread` : "You're up to date"}
                </small>
              </div>
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>

            <div className="zx-notification-popover__list">
              {rows.slice(0, 10).map((row) => {
                const Icon = iconFor(row);
                return (
                  <Link
                    key={row.id}
                    href={
                      row.action_url || "/dashboard/notifications"
                    }
                    className={`zx-notification-mini ${toneFor(
                      row,
                    )} ${row.read_at ? "" : "is-unread"}`}
                    onClick={() => {
                      void markRead(row.id);
                      setOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>
                      <strong>{row.title}</strong>
                      <small>{row.body}</small>
                    </span>
                  </Link>
                );
              })}

              {!rows.length ? (
                <div className="zx-notification-empty">
                  No notifications yet.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`zx-live-toast ${toneFor(toast)}`}
        >
          <div className="zx-live-toast__icon">
            <ToastIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
            {toast.action_url ? (
              <Link
                href={toast.action_url}
                onClick={() => {
                  void markRead(toast.id);
                  setToast(null);
                }}
              >
                Open details
              </Link>
            ) : null}
          </div>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
