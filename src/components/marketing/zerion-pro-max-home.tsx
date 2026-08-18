import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  ChartCandlestick,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { PricingPreview } from "@/components/marketing/pricing-preview";

export function ZerionProMaxHome() {
  return (
    <>
      <section className="zx18-hero">
        <div className="zx18-hero-grid">
          <div>
            <p className="eyebrow">ZERION X1 · AI TRADING OPERATING SYSTEM</p>
            <h1 className="zx18-title">
              Markets move fast. <span>Zerion thinks with you.</span>
            </h1>
            <p className="zx18-lead">
              Connect your broker, build or deploy strategies, monitor markets,
              run paper workflows and prepare live trades from one AI-native
              command system.
            </p>
            <div className="zx18-actions">
              <Link href="/signup" className="zx-primary-action">
                Start Zerion <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/pricing" className="zx-secondary-action">
                View plans
              </Link>
            </div>
            <div className="zx18-proof">
              <span>Indian markets</span>
              <span>Forex</span>
              <span>F&O workflow</span>
              <span>Paper + live separated</span>
              <span>AI-assisted strategies</span>
            </div>
          </div>

          <div className="zx18-command">
            <div className="zx18-command-head">
              <div>
                <p className="eyebrow">LIVE COMMAND VIEW</p>
                <strong>NIFTY · Strategy Monitor</strong>
              </div>
              <span className="zx18-live-dot">Monitoring</span>
            </div>
            <div className="zx18-command-chart">
              <div className="zx18-line" />
            </div>
            <div className="zx18-metrics">
              <div className="zx18-metric"><span>Setup</span><strong>ORB + Volume</strong></div>
              <div className="zx18-metric"><span>Risk</span><strong>Controlled</strong></div>
              <div className="zx18-metric"><span>Action</span><strong>User confirms</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="zx18-section">
        <div className="zx18-wrap">
          <div className="zx18-section-head">
            <div>
              <p className="eyebrow">ONE SYSTEM, CLEAR FLOW</p>
              <h2>Built around what a trader actually needs.</h2>
            </div>
            <p>
              Zerion keeps research, strategy, automation, broker connections,
              paper trading, risk checks and live execution in one connected
              workflow without forcing beginners to understand every technical
              screen first.
            </p>
          </div>

          <div className="zx18-bento">
            <article>
              <BrainCircuit />
              <h3>Ask Zerion</h3>
              <p>
                Say what you want in normal language: explain a chart, build a
                strategy, test an idea, compare setups or prepare a trade.
              </p>
            </article>
            <article>
              <ChartCandlestick />
              <h3>Markets + F&O</h3>
              <p>Indian equities, indices, futures/options and Forex workflows.</p>
            </article>
            <article>
              <Workflow />
              <h3>Deploy strategies</h3>
              <p>Install a template or customize it, then let Zerion monitor its rules.</p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Risk before order</h3>
              <p>Trade proposals stay behind risk checks and user confirmation.</p>
            </article>
            <article>
              <Layers3 />
              <h3>Paper and live stay separate</h3>
              <p>Separate account state, P&L and execution context.</p>
            </article>
          </div>
        </div>
      </section>

      <PricingPreview />
    </>
  );
}
