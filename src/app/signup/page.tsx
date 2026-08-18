"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);

      const firstName = String(formData.get("firstName") ?? "").trim();
      const lastName = String(formData.get("lastName") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      if (!firstName || !lastName || !email || !password) {
        throw new Error("Please complete all required fields.");
      }

      if (password.length < 12) {
        throw new Error("Password must contain at least 12 characters.");
      }

      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        const syncResponse = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ accessToken: data.session.access_token }),
        });
        if (!syncResponse.ok) throw new Error("Unable to establish the Zerion session.");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Account created. Check your email and verify your account before logging in.",
      );

      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setErrorMessage("");
    setSuccessMessage("");
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
      eyebrow="Create your workspace"
      title="Start with disciplined market research."
      description="Create an account to use paper trading, strategy research and Zerion X1 risk tools."
    >
      <Button
        type="button"
        size="lg"
        variant="secondary"
        onClick={handleGoogleSignup}
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

      <form className="auth-form" onSubmit={handleSignup}>
        <div className="auth-form__grid">
          <label>
            First name
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              required
              disabled={isSubmitting}
            />
          </label>

          <label>
            Last name
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              required
              disabled={isSubmitting}
            />
          </label>
        </div>

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
          Create password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="checkbox-label checkbox-label--agreement">
          <input
            type="checkbox"
            name="agreement"
            required
            disabled={isSubmitting}
          />
          <span>
            I agree to the <Link href="/legal/terms">Terms</Link>,{" "}
            <Link href="/legal/privacy">Privacy Policy</Link> and{" "}
            <Link href="/legal/risk-disclosure">Risk Disclosure</Link>.
          </span>
        </label>

        {errorMessage ? (
          <p role="alert" style={{ color: "#8C8A81", margin: 0 }}>
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p role="status" style={{ color: "#E4E0DF", margin: 0 }}>
            {successMessage}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || isGoogleLoading}
        >
          {isSubmitting ? "Creating account..." : "Create Zerion account"}
        </Button>
      </form>

      <p className="auth-card__switch">
        Already registered? <Link href="/login">Login</Link>
      </p>
    </AuthShell>
  );
}
