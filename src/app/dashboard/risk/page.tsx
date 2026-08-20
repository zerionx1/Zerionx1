import { PositionSizeCalculator } from "@/components/risk/position-size-calculator";
import { RiskScorecard } from "@/components/risk/risk-scorecard";
import { KillSwitchCard } from "@/components/risk/kill-switch-card";
import { TradingRiskControlsPanel } from "@/components/risk/trading-risk-controls";
import { classifyRisk } from "@/lib/risk/risk-engine";
import { paperStore } from "@/lib/paper/paper-store";

export default async function Page() {
  const [account, positions] = await Promise.all([
    paperStore.getAccount(),
    paperStore.listPositions(),
  ]);
  const grossExposure = positions.reduce(
    (sum, p) => sum + Math.abs(p.quantity * p.markPrice),
    0,
  );
  const netExposure = positions.reduce(
    (sum, p) => sum + p.quantity * p.markPrice,
    0,
  );
  const maxPosition = Math.max(
    0,
    ...positions.map((p) => Math.abs(p.quantity * p.markPrice)),
  );
  const dailyLossPct =
    account.equity > 0
      ? Math.max(0, (-account.dailyPnl / account.equity) * 100)
      : 0;
  const drawdownPct =
    account.startingBalance > 0
      ? Math.max(
          0,
          ((account.startingBalance - account.equity) /
            account.startingBalance) *
            100,
        )
      : 0;
  const base = {
    accountId: account.id,
    equity: account.equity,
    cash: account.cashBalance,
    grossExposure,
    netExposure,
    leverage: account.equity > 0 ? grossExposure / account.equity : 0,
    dailyLossPct,
    drawdownPct,
    openRiskAmount: positions.reduce(
      (sum, p) => sum + Math.abs(p.unrealizedPnl),
      0,
    ),
    concentrationPct:
      grossExposure > 0 ? (maxPosition / grossExposure) * 100 : 0,
    correlatedExposurePct: 0,
    calculatedAt: new Date().toISOString(),
  };
  const snapshot = { ...base, level: classifyRisk(base) };

  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Trading Risk Controls</p>
          <h1>Risk OS</h1>
          <p>
            Persisted paper/live limits are enforced before Zerion accepts
            strategy, paper or live proposal actions.
          </p>
        </div>
      </div>
      <TradingRiskControlsPanel />
      <div className="mt-6">
        <RiskScorecard snapshot={snapshot} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <PositionSizeCalculator />
        <KillSwitchCard />
      </div>
    </main>
  );
}
