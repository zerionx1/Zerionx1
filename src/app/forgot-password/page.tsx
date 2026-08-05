import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter your registered email address. A verified recovery workflow will send further instructions."
    >
      <form className="auth-form">
        <label>
          Email address
          <input type="email" name="email" autoComplete="email" required />
        </label>

        <Button type="submit" size="lg">
          Send recovery instructions
        </Button>
      </form>

      <p className="auth-card__switch">
        Remembered your password? <Link href="/login">Return to login</Link>
      </p>
    </AuthShell>
  );
}
