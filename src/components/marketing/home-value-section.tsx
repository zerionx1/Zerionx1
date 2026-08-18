import {
  BrainCircuit,
  ChartNoAxesCombined,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type ValueItem = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

const items: ValueItem[] = [
  {
    icon: BrainCircuit,
    title: "Ask Zerion in simple language",
    copy: "Explain a setup, build a strategy, test an idea or prepare a trade proposal.",
  },
  {
    icon: Workflow,
    title: "Automation without losing control",
    copy: "Strategies monitor conditions continuously while live orders stay behind confirmation.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "One workflow across markets",
    copy: "Indian markets and Forex are the current production focus. Crypto is transparently coming soon.",
  },
  {
    icon: ShieldCheck,
    title: "Risk before execution",
    copy: "Paper and live P&L stay separate with risk checks and broker authorization.",
  },
];

export function HomeValueSection() {
  return (
    <section className="marketing-section">
      <div className="marketing-container">
        <div className="zx-home-section-heading">
          <div>
            <p className="eyebrow">What Zerion actually does</p>
            <h2>
              A trading operating system designed to reduce manual complexity.
            </h2>
          </div>
        </div>

        <div className="zx-value-grid">
          {items.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
