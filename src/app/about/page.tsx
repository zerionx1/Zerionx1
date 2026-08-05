import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { CinematicBackground } from "@/components/marketing/cinematic-background";

export default function AboutPage() {
  return (
    <div className="marketing-page">
      <CinematicBackground />
      <MarketingHeader />

      <main className="content-page">
        <div className="marketing-container content-page__inner">
          <p className="eyebrow">About Zerion X1</p>
          <h1>A market-intelligence platform built around discipline.</h1>

          <div className="content-page__grid">
            <section>
              <h2>What Zerion X1 is</h2>
              <p>
                Zerion X1 is a multi-market research, strategy, paper trading,
                risk and execution-control platform. Its first priorities are
                Indian markets, crypto and Forex.
              </p>
            </section>

            <section>
              <h2>Why it exists</h2>
              <p>
                Many trading platforms separate screeners, charts, signals,
                strategy testing, risk controls and journals. Zerion X1 is being
                designed to manage these workflows through one connected system.
              </p>
            </section>

            <section>
              <h2>What makes it different</h2>
              <p>
                The platform focuses on explainable evidence, explicit user
                authorization, paper-first workflows, visible risk boundaries
                and complete activity records.
              </p>
            </section>

            <section>
              <h2>What Zerion X1 does not promise</h2>
              <p>
                Zerion X1 does not guarantee profits, remove market risk or
                replace professional financial advice. The user remains
                responsible for every financial decision.
              </p>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
