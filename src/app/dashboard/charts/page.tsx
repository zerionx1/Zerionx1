import { MarketChartTerminal } from "@/components/markets/market-chart-terminal";
import { ActiveStrategyRuntime } from "@/components/strategies/active-strategy-runtime";

export default function ChartsPage() {
  return (
    <main className="dashboard-page zx-chart-dedicated">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHARTS</p>
          <h1>Full Market Chart Terminal</h1>
          <p>Chart-first workspace for provider-backed markets and enabled strategies.</p>
        </div>
      </div>
      <ActiveStrategyRuntime />
      <MarketChartTerminal />
    </main>
  );
}
