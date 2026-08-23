import { UnifiedPositionsCenter } from "@/components/portfolio/unified-positions-center";

export default function PositionsPage() {
  return (
    <main className="dashboard-page x1-page-enter">
      <div className="page-heading x1-page-heading">
        <div>
          <p className="eyebrow">PAPER + REAL</p>
          <h1>Positions</h1>
          <p>One clean view for simulated and connected live positions across India, crypto and Forex.</p>
        </div>
      </div>
      <UnifiedPositionsCenter />
    </main>
  );
}
