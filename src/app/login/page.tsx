import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure account access"
      title="Welcome back."
      description="Access your Zerion X1 workspace, strategies, simulations and risk controls."
    >
      <form className="auth-form">
        <label>
          Email address
          <input type="email" name="email" autoComplete="email" required />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>

        <div className="auth-form__row">
          <label className="checkbox-label">
            <input type="checkbox" />
            Keep me signed in
          </label>

          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <Button type="submit" size="lg">
          Secure login
        </Button>
      </form>

      <p className="auth-card__switch">
        New to Zerion X1? <Link href="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}
