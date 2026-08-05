import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Create your workspace"
      title="Start with disciplined market research."
      description="Create an account to use paper trading, strategy research and Zerion X1 risk tools."
    >
      <form className="auth-form">
        <div className="auth-form__grid">
          <label>
            First name
            <input type="text" name="firstName" autoComplete="given-name" required />
          </label>

          <label>
            Last name
            <input type="text" name="lastName" autoComplete="family-name" required />
          </label>
        </div>

        <label>
          Email address
          <input type="email" name="email" autoComplete="email" required />
        </label>

        <label>
          Create password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </label>

        <label className="checkbox-label checkbox-label--agreement">
          <input type="checkbox" required />
          <span>
            I agree to the <Link href="/legal/terms">Terms</Link>,{" "}
            <Link href="/legal/privacy">Privacy Policy</Link> and{" "}
            <Link href="/legal/risk-disclosure">Risk Disclosure</Link>.
          </span>
        </label>

        <Button type="submit" size="lg">
          Create Zerion account
        </Button>
      </form>

      <p className="auth-card__switch">
        Already registered? <Link href="/login">Login</Link>
      </p>
    </AuthShell>
  );
}
