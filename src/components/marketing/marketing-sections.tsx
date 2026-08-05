import Link from "next/link";
import {
  Activity,
  BarChart3,
  BellRing,
  Bitcoin,
  Bot,
  BrainCircuit,
  Building2,
  ChartCandlestick,
  Check,
  CircleDollarSign,
  Code2,
  Database,
  Globe2,
  Landmark,
  Layers3,
  LockKeyhole,
  Radar,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    icon: BrainCircuit,
    title: "Explainable intelligence",
    copy:
      "Every opportunity can include contributing factors, confidence range, invalidation conditions, freshness and model version.",
  },
  {
    icon: Workflow,
    title: "Visual strategy builder",
    copy:
      "Create structured trading logic through visual nodes, indicators, conditions, entries, exits and bounded risk rules.",
  },
  {
    icon: ChartCandlestick,
    title: "Backtesting laboratory",
    copy:
      "Test strategies against historical candles with explicit commissions, slippage, drawdown and anti-overfitting warnings.",
  },
  {
    icon: Activity,
    title: "Paper trading engine",
    copy:
      "Practice in a simulated portfolio before connecting any broker or allowing real-money execution.",
  },
  {
    icon: ShieldCheck,
    title: "Risk operating system",
    copy:
      "Position sizing, maximum daily loss, portfolio exposure, stale-data blocking and emergency kill switches.",
  },
  {
    icon: SlidersHorizontal,
    title: "Founder Admin OS",
    copy:
      "Manage plans, users, features, providers, moderation, incidents and platform controls without editing source code.",
  },
];

const markets = [
  {
    icon: Landmark,
    title: "Indian Markets",
    status: "Primary focus",
    copy:
      "Architecture for Indian equities, indices, futures, options and approved broker connectivity.",
  },
  {
    icon: Bitcoin,
    title: "Crypto Markets",
    status: "Secondary focus",
    copy:
      "Provider-neutral crypto market data, strategy research, paper trading and verified exchange adapters.",
  },
  {
    icon: Globe2,
    title: "Forex Markets",
    status: "Advanced plan",
    copy:
      "Currency-pair intelligence, session awareness, volatility analysis and compliant broker connectivity.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Choose a market",
    copy:
      "Select Indian markets, crypto or Forex according to your subscription and available data provider.",
  },
  {
    number: "02",
    title: "Research and build",
    copy:
      "Use screeners, indicators, market structure and the visual strategy studio to define your logic.",
  },
  {
    number: "03",
    title: "Backtest and simulate",
    copy:
      "Review historical behaviour, risk-adjusted performance and paper-trading execution before real capital.",
  },
  {
    number: "04",
    title: "Review opportunity",
    copy:
      "Zerion can surface a probability-based opportunity with evidence, warnings and an expiry window.",
  },
  {
    number: "05",
    title: "Confirm or reject",
    copy:
      "AI-assisted trades require explicit user confirmation unless the user has configured a valid bounded authorization rule.",
  },
];

const pricing = [
  {
    name: "Free",
    price: "₹0",
    description: "Understand the platform and practice safely.",
    features: [
      "Demo and delayed sample data",
      "Limited paper trading",
      "Basic strategy templates",
      "Risk education",
    ],
  },
  {
    name: "India",
    price: "₹499",
    description: "For Indian-market research and simulation.",
    features: [
      "Indian market workspace",
      "Advanced paper trading",
      "Strategy builder",
      "Risk and journal tools",
    ],
  },
  {
    name: "India + Crypto",
    price: "₹2,499",
    description: "Expanded multi-market intelligence.",
    featured: true,
    features: [
      "Indian and crypto markets",
      "Advanced screeners",
      "Backtesting and optimization",
      "Model insight and reporting",
    ],
  },
  {
    name: "Global",
    price: "₹5,499",
    description: "Indian, crypto and Forex capabilities.",
    features: [
      "Indian, crypto and Forex",
      "Advanced portfolio controls",
      "Priority integrations",
      "Founder-defined premium limits",
    ],
  },
];

const frequentlyAsked = [
  {
    question: "Does Zerion X1 guarantee profit?",
    answer:
      "No. Zerion X1 provides research, simulation, risk tools and probability-based decision support. Markets remain uncertain and losses are possible.",
  },
  {
    question: "Will AI place trades automatically?",
    answer:
      "An AI-suggested trade cannot execute without explicit confirmation, unless the user has already created a valid, bounded and revocable authorization rule.",
  },
  {
    question: "Is the data currently shown live?",
    answer:
      "No. Until verified market-data providers are connected, all displayed quotes, charts and signals must be treated as demo or delayed sample information.",
  },
  {
    question: "Can I paper trade before connecting a broker?",
    answer:
      "Yes. Paper trading and historical research are core Zerion X1 workflows and should be completed before enabling any live integration.",
  },
];

export function MarketingSections() {
  return (
    <>
      <section id="platform" className="marketing-section">
        <div className="marketing-container">
          <div className="section-heading">
            <p className="eyebrow">The Zerion X1 platform</p>
            <h2>More than an algo-trading dashboard.</h2>
            <p>
              Zerion X1 is designed as a complete market-intelligence and risk
              operating system rather than a simple buy-and-sell signal tool.
            </p>
          </div>

          <div className="capability-grid">
            {capabilities.map(({ icon: Icon, title, copy }) => (
              <article className="luxury-card" key={title}>
                <div className="luxury-card__icon">
                  <Icon aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="markets" className="marketing-section">
        <div className="marketing-container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Multi-market architecture</p>
              <h2>One workflow across three priority markets.</h2>
            </div>
            <p>
              Provider adapters remain disabled until licensed data, credentials
              and required compliance checks are configured.
            </p>
          </div>

          <div className="market-grid">
            {markets.map(({ icon: Icon, title, status, copy }) => (
              <article className="market-card" key={title}>
                <div className="market-card__top">
                  <Icon aria-hidden="true" />
                  <span>{status}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="marketing-section">
        <div className="marketing-container">
          <div className="section-heading">
            <p className="eyebrow">Responsible workflow</p>
            <h2>Research first. Simulate second. Confirm before execution.</h2>
          </div>

          <div className="workflow-list">
            {workflowSteps.map((step) => (
              <article className="workflow-step" key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <div className="dual-feature-grid">
            <article className="feature-panel">
              <div className="feature-panel__icon">
                <Bot aria-hidden="true" />
              </div>
              <p className="eyebrow">Probability intelligence</p>
              <h2>Not a blind call. A documented decision framework.</h2>
              <p>
                Zerion can combine technical structure, momentum, volatility,
                liquidity, timeframe agreement, risk-reward and data quality.
                Confidence does not mean certainty.
              </p>

              <ul>
                <li><Check /> Contributing factors</li>
                <li><Check /> Invalidating conditions</li>
                <li><Check /> Data freshness</li>
                <li><Check /> Model and strategy version</li>
              </ul>
            </article>

            <article className="feature-panel">
              <div className="feature-panel__icon">
                <LockKeyhole aria-hidden="true" />
              </div>
              <p className="eyebrow">Execution boundary</p>
              <h2>User control remains central.</h2>
              <p>
                Live execution is disabled by default. Broker verification,
                account authorization, risk checks, fresh pricing and explicit
                user consent are required before any real order can progress.
              </p>

              <ul>
                <li><Check /> Duplicate-order prevention</li>
                <li><Check /> Stale-price blocking</li>
                <li><Check /> Emergency kill switch</li>
                <li><Check /> Complete audit trail</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-section data-transparency">
        <div className="marketing-container">
          <div className="data-transparency__content">
            <div>
              <p className="eyebrow">Data transparency</p>
              <h2>What you currently see is not real-time market data.</h2>
              <p>
                The present development build uses sample or delayed information
                solely to demonstrate layouts and workflows. Real-time labels
                will only appear after an approved provider is connected,
                authenticated and continuously monitored.
              </p>
            </div>

            <div className="data-transparency__items">
              <div>
                <Database />
                <span>Demo data clearly labelled</span>
              </div>
              <div>
                <Radar />
                <span>Stale feed automatically blocked</span>
              </div>
              <div>
                <BellRing />
                <span>Provider outage alerts</span>
              </div>
              <div>
                <Scale />
                <span>No prediction guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <div className="section-heading">
            <p className="eyebrow">Membership</p>
            <h2>Choose access by market and capability.</h2>
            <p>
              Higher plans add markets, tools, integrations and usage limits.
              They do not create artificial accuracy guarantees.
            </p>
          </div>

          <div className="pricing-preview">
            {pricing.map((plan) => (
              <article
                key={plan.name}
                className={`pricing-preview__card ${
                  plan.featured ? "pricing-preview__card--featured" : ""
                }`}
              >
                <p className="eyebrow">{plan.name}</p>
                <h3>
                  {plan.price}
                  <span>/month</span>
                </h3>
                <p>{plan.description}</p>

                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button asChild variant={plan.featured ? "primary" : "secondary"}>
                  <Link href="/signup">Choose {plan.name}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <div className="security-callout">
            <div>
              <p className="eyebrow">Security by design</p>
              <h2>Financial workflows must fail closed.</h2>
              <p>
                Zerion X1 is designed around encrypted secrets, explicit
                permissions, execution reconciliation, audit records, role
                separation and emergency controls.
              </p>
            </div>

            <div className="security-callout__icons">
              <ShieldCheck />
              <LockKeyhole />
              <Code2 />
              <Layers3 />
            </div>

            <Button asChild>
              <Link href="/security">Explore security standards</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <div className="section-heading">
            <p className="eyebrow">Frequently asked questions</p>
            <h2>Understand Zerion before using it.</h2>
          </div>

          <div className="faq-grid">
            {frequentlyAsked.map((item) => (
              <article className="faq-card" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="section-action">
            <Button asChild variant="secondary">
              <Link href="/faq">View complete FAQ</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container final-cta">
          <Sparkles aria-hidden="true" />
          <p className="eyebrow">Zerion X1</p>
          <h2>Build disciplined systems, not emotional trades.</h2>
          <p>
            Start with research, paper trading and risk controls. Connect live
            providers only when the complete execution environment is verified.
          </p>

          <div>
            <Button asChild size="lg">
              <Link href="/signup">Create your account</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/about">Learn about Zerion X1</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
