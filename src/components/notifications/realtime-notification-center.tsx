"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  priority?: string;
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
};

export function RealtimeNotificationCenter() {
  const [toast, setToast] = useState<NotificationRow | null>(null);
  const [unread, setUnread] = useState(0);
  const seen = useRef(new Set<string>());
  const initial = useRef(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications/inbox", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = await response.json();
    const rows = (body.data?.notifications ?? []) as NotificationRow[];
    setUnread(rows.filter((row) => !row.read_at).length);

    if (initial.current) {
      rows.forEach((row) => seen.current.add(row.id));
      initial.current = false;
      return;
    }

    const fresh = rows.find((row) => !seen.current.has(row.id));
    rows.forEach((row) => seen.current.add(row.id));
    if (fresh) setToast(fresh);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <Link
        href="/dashboard/notifications"
        className="fixed right-4 top-[74px] z-40 hidden rounded-full border border-black/10 bg-[#F3F1EC] px-3 py-2 text-xs text-[#2F2A25] shadow-lg lg:flex"
      >
        <Bell className="mr-2 h-4 w-4" />
        {unread ? `${unread} unread` : "Notifications"}
      </Link>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-3 right-3 z-[95] rounded-2xl border border-black/10 bg-[#F7F4ED] p-4 text-[#2F2A25] shadow-2xl sm:left-auto sm:right-5 sm:w-[390px] lg:bottom-5"
        >
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="block">{toast.title}</strong>
              <p className="mt-1 text-sm opacity-70">{toast.body}</p>
              {toast.action_url ? (
                <Link
                  href={toast.action_url}
                  className="mt-2 inline-block text-sm font-semibold underline"
                  onClick={() => setToast(null)}
                >
                  Open
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
        </div>
      ) : null}
    </>
  );
}
