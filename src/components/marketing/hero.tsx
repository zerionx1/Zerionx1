import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const proofPoints = [
  "India-first multi-market architecture",
  "Paper trading before live execution",
  "Explicit user approval for AI opportunities",
  "No guaranteed-profit claims",
];

export function Hero() {
  return (
    <section className="hero-shell">
      <div className="marketing-container hero-layout">
        <div className="hero-copy">
          <p className="eyebrow">Indian Markets · Crypto · Forex</p>

          <h1 className="hero-title">
            One intelligent operating system for
            <span> disciplined market decisions.</span>
          </h1>

          <p className="hero-description">
            Zerion X1 brings strategy research, probability-based intelligence,
            paper trading, portfolio controls, risk management and user-approved
            execution into one premium workspace.
          </p>

          <div className="hero-actions">
            <Button asChild size="lg">
              <Link href="/signup">
                Start with Zerion X1
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard">
                Explore demo workspace
              </Link>
            </Button>
          </div>

          <div className="hero-proof">
            {proofPoints.map((item) => (
              <div key={item}>
                <CircleCheck aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="hero-intelligence-card">
          <div className="hero-intelligence-card__header">
            <div>
              <p className="eyebrow">Zerion Intelligence Layer</p>
              <h2>Evidence before execution.</h2>
            </div>
            <BrainCircuit aria-hidden="true" />
          </div>

          <div className="hero-intelligence-card__body">
            <div className="hero-metric">
              <span>Opportunity classification</span>
              <strong>Probability range</strong>
            </div>

            <div className="hero-metric">
              <span>Execution state</span>
              <strong>User confirmation required</strong>
            </div>

            <div className="hero-metric">
              <span>Risk controls</span>
              <strong>Position · Daily · Portfolio</strong>
            </div>

            <div className="hero-metric">
              <span>Current displayed data</span>
              <strong className="demo-label">Demo / delayed sample</strong>
            </div>
          </div>

          <div className="hero-intelligence-card__footer">
            <ShieldCheck aria-hidden="true" />
            <p>
              Zerion X1 does not promise profits. Live execution remains disabled
              until verified providers, compliance controls and explicit user
              authorization are active.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
