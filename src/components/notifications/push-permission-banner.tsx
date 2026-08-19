"use client";

import { BellRing, X } from "lucide-react";
import { useEffect, useState } from "react";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) return;

    if (Notification.permission === "default") setVisible(true);
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const configResponse = await fetch("/api/notifications/push/config", { cache: "no-store" });
      const configBody = await configResponse.json();
      const publicKey = configBody.data?.publicKey as string | undefined;
      if (!publicKey) throw new Error("Push notifications are not configured on the server yet.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        return;
      }

      await navigator.serviceWorker.register("/zerion-push-sw.js");
      const ready = await navigator.serviceWorker.ready;
      const existing = await ready.pushManager.getSubscription();
      const subscription = existing ?? await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      });

      const response = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Push subscription failed.");
      }
      setVisible(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push notification setup failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible && !message) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-xl rounded-3xl border border-amber-100/20 bg-[#171c20]/95 p-4 shadow-2xl backdrop-blur-xl lg:bottom-6">
      <div className="flex items-start gap-3">
        <span className="x1-menu-icon"><BellRing className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <strong>Enable Zerion market alerts</strong>
          <p className="mt-1 text-sm text-white/55">
            Receive browser notifications when an enabled strategy or Zerion opportunity engine detects a qualifying market condition.
          </p>
          {message ? <p className="mt-2 text-xs text-amber-100/70">{message}</p> : null}
          <button type="button" onClick={() => void enable()} disabled={busy} className="zx-primary-action mt-3">
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        </div>
        <button type="button" aria-label="Dismiss notification prompt" onClick={() => { setVisible(false); setMessage(""); }} className="zx-page-back">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
