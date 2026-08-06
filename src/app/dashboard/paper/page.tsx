import { PaperTradingWorkspace } from "@/components/paper/paper-trading-workspace";

export default function PaperPage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Risk-contained execution laboratory</p>
          <h1>Paper Trading Terminal</h1>
          <p>Practice multi-market orders, review fills, positions and P&amp;L with persistent account state.</p>
        </div>
        <span className="status-pill">No real money</span>
      </div>
      <PaperTradingWorkspace />
    </main>
  );
}
