import { MarketIntelligenceHub } from "@/components/intelligence/market-intelligence-hub";

export default function IntelligencePage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Probability, not promises</p>
          <h1>Market Intelligence</h1>
          <p>
            Technical, news, chart, fundamental and options intelligence in one
            provider-aware workspace.
          </p>
        </div>
      </div>
      <MarketIntelligenceHub />
    </main>
  );
}
