"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing secure sign-in…");

  useEffect(() => {
    let active = true;
    async function complete() {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setMessage(error?.message ?? "No authenticated session was returned.");
        return;
      }
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(payload?.error ?? "Unable to establish the Zerion session.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    }
    void complete();
    return () => { active = false; };
  }, [router]);

  return <main className="grid min-h-screen place-items-center p-6"><p>{message}</p></main>;
}
