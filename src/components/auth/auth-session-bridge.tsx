"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

async function syncServerCookie(accessToken: string | null) {
  if (!accessToken) {
    await fetch("/api/auth/sync", {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
    return;
  }
  await fetch("/api/auth/sync", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accessToken }),
  }).catch(() => {});
}

export function AuthSessionBridge() {
  const lastToken = useRef("");

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createBrowserSupabaseClient>;
    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      return;
    }

    const push = async (token: string | null) => {
      if (!active) return;
      if (token && token === lastToken.current) return;
      lastToken.current = token ?? "";
      await syncServerCookie(token);
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => push(data.session?.access_token ?? null));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        lastToken.current = "";
        void syncServerCookie(null);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        void push(session?.access_token ?? null);
      }
    });

    const syncWhenActive = () => {
      if (document.hidden) return;
      void supabase.auth
        .getSession()
        .then(({ data }) => push(data.session?.access_token ?? null));
    };

    document.addEventListener("visibilitychange", syncWhenActive);
    window.addEventListener("online", syncWhenActive);

    return () => {
      active = false;
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", syncWhenActive);
      window.removeEventListener("online", syncWhenActive);
    };
  }, []);

  return null;
}
