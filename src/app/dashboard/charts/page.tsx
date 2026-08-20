import { MarketChartTerminal } from "@/components/markets/market-chart-terminal";

export default function ChartsPage() {
  return (
    <main className="dashboard-page zx-chart-dedicated">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHARTS</p>
          <h1>Zerion Market Terminal</h1>
          <p>One provider-backed chart workspace for search, positions, trades and market navigation.</p>
        </div>
      </div>
      <MarketChartTerminal />
    </main>
  );
}
