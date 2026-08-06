"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;
      if (!accessToken) throw new Error("Supabase did not return an authenticated session.");
      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      if (!syncResponse.ok) throw new Error("Unable to establish the Zerion session.");

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Check your email and password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMessage("");
    setIsGoogleLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.",
      );
      setIsGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Secure account access"
      title="Welcome back."
      description="Access your Zerion X1 workspace, strategies, simulations and risk controls."
    >
      <Button
        type="button"
        size="lg"
        variant="secondary"
        onClick={handleGoogleLogin}
        disabled={isSubmitting || isGoogleLoading}
      >
        {isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}
      </Button>

      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "22px 0",
          opacity: 0.72,
        }}
      >
        <span style={{ height: "1px", flex: 1, background: "currentColor" }} />
        <span style={{ fontSize: "12px" }}>OR USE EMAIL</span>
        <span style={{ height: "1px", flex: 1, background: "currentColor" }} />
      </div>

      <form className="auth-form" onSubmit={handleLogin}>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />
        </label>

        <div className="auth-form__row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="remember"
              disabled={isSubmitting}
            />
            Keep me signed in
          </label>

          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        {errorMessage ? (
          <p role="alert" style={{ color: "#ffb4b4", margin: 0 }}>
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || isGoogleLoading}
        >
          {isSubmitting ? "Signing in..." : "Secure login"}
        </Button>
      </form>

      <p className="auth-card__switch">
        New to Zerion X1? <Link href="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}
