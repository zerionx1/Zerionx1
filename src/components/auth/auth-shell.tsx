import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { CinematicBackground } from "@/components/marketing/cinematic-background";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <CinematicBackground />

      <Link href="/" className="auth-page__brand">
        ZERION X1
      </Link>

      <section className="auth-card">
        <div className="auth-card__intro">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        {children}

        <div className="auth-card__security">
          <ShieldCheck />
          <p>
            Never share broker passwords, OTPs or API secrets through this form.
          </p>
        </div>
      </section>
    </main>
  );
}
