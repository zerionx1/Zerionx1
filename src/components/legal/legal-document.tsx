import type { ReactNode } from "react";
import { CinematicBackground } from "@/components/marketing/cinematic-background";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";

export function LegalDocument({
  eyebrow,
  title,
  introduction,
  children,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <div className="marketing-page">
      <CinematicBackground />
      <MarketingHeader />

      <main className="legal-document">
        <div className="marketing-container">
          <header className="legal-document__header">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{introduction}</p>
          </header>

          <div className="legal-document__body">{children}</div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
  highlight = false,
}: {
  title: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <section className={`legal-section ${highlight ? "legal-highlight" : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
