import { MarketChartTerminal } from "@/components/markets/market-chart-terminal";

export default function ChartsPage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHARTS</p>
          <h1>Full Market Chart Terminal</h1>
          <p>Search stocks, indices, F&amp;O segments, Forex pairs and crypto charts in one dedicated workspace.</p>
        </div>
      </div>
      <MarketChartTerminal />
    </main>
  );
}
