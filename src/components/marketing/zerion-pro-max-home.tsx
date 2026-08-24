import Link from "next/link";
import {
  BrainCircuit,
  ChartNoAxesCombined,
  Landmark,
  ShieldCheck,
  WandSparkles,
  Workflow,
} from "lucide-react";
import { PricingPreview } from "@/components/marketing/pricing-preview";

const caps = [
  [
    ChartNoAxesCombined,
    "One market operating system",
    "Charts, paper trading, strategies and execution in one structured workflow.",
  ],
  [
    BrainCircuit,
    "AI-guided analysis",
    "Explain setups, compare conditions and build strategy drafts with Zerion AI.",
  ],
  [
    Workflow,
    "Strategies and automation",
    "Start from templates, customize rules, backtest and deploy controlled workflows.",
  ],
  [
    ShieldCheck,
    "Risk before execution",
    "Stop loss, target, max loss, max profit and explicit confirmation stay in the path.",
  ],
  [
    Landmark,
    "Broker-connected markets",
    "Upstox for Indian markets, CoinDCX for crypto and Exness MT5 for Forex.",
  ],
  [
    WandSparkles,
    "Built for expansion",
    "Prepared for PowerX intelligence, more providers and deeper automation.",
  ],
] as const;

export function ZerionProMaxHome() {
  return (
    <div className="zx-luxury-home">
      <section className="zx-luxury-hero" id="platform">
        <div className="zx-luxury-hero__content">
          <p className="eyebrow">ZERION X1 · MULTI-MARKET INTELLIGENCE</p>
          <h1>Analyze. Build. Test. Execute.</h1>
          <p>
            Zerion X1 brings market charts, strategy building, AI-assisted
            research, paper trading, broker connections and risk-controlled
            execution into one premium trading operating system.
          </p>
          <div className="zx-luxury-actions">
            <Link href="/signup" className="zx-primary-action">
              Create free account
            </Link>
            <Link href="/login" className="zx-secondary-action">
              Login
            </Link>
            <Link href="/pricing" className="zx-secondary-action">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="zx-home-grid" id="how-it-works">
        {caps.map(([Icon, title, copy]) => (
          <article key={title}>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="zx-home-section" id="markets">
        <p className="eyebrow">MARKETS</p>
        <h2>Indian markets first. Forex connected. Crypto prepared for the next stage.</h2>
        <p>
          Explore equities, indices, futures and options through the Indian
          workflow, Forex through Exness MT5, and keep crypto marked as coming
          soon until production connectivity is enabled.
        </p>
        <div className="zx-home-pills">
          <span>Indian Equity</span>
          <span>Indices</span>
          <span>Futures</span>
          <span>Options</span>
          <span>Forex</span>
          <span>Crypto · CoinDCX</span>
        </div>
      </section>

      <section className="zx-home-section">
        <p className="eyebrow">WHY ZERION</p>
        <h2>Clear workspaces instead of one crowded page.</h2>
        <p>
          Charts, Paper Orders, Positions, History, Strategies, Broker
          Connections, Live Positions and AI remain separated so users know
          exactly where analysis ends and execution begins.
        </p>
      </section>

      <PricingPreview />
    </div>
  );
}
