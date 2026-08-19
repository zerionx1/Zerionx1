import { paperStore } from "@/lib/paper/paper-store";

function number(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export default async function AnalyticsPage() {
  const [account, positions, orders] = await Promise.all([
    paperStore.getAccount(),
    paperStore.listPositions(),
    paperStore.listOrders(),
  ]);

  const closed = positions.filter((item) => item.quantity === 0);
  const realized = closed.map((item) => number(item.realizedPnl));
  const wins = realized.filter((value) => value > 0);
  const losses = realized.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const netPnl = realized.reduce((sum, value) => sum + value, 0);
  const winRate = realized.length ? (wins.length / realized.length) * 100 : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0;
  const expectancy = realized.length ? netPnl / realized.length : 0;

  const openExposure = positions
    .filter((item) => item.quantity !== 0)
    .reduce(
      (sum, item) => sum + Math.abs(item.quantity * item.markPrice),
      0,
    );

  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account-backed analytics</p>
          <h1>Performance Analytics</h1>
          <p>
            These numbers come from your persisted Zerion paper account and
            positions. No illustrative equity curve or fabricated trade series.
          </p>
        </div>
        <span className="status-pill">Live account state</span>
      </div>

      <div className="stat-grid">
        {[
          ["Net realized P&L", `${account.currency} ${netPnl.toLocaleString()}`],
          ["Win rate", `${winRate.toFixed(1)}%`],
          [
            "Profit factor",
            profitFactor === Infinity ? "∞" : profitFactor.toFixed(2),
          ],
          ["Expectancy / close", `${account.currency} ${expectancy.toFixed(2)}`],
          ["Open exposure", `${account.currency} ${openExposure.toLocaleString()}`],
          ["Recorded orders", orders.length],
        ].map(([key, value]) => (
          <div className="stat-tile" key={String(key)}>
            <span>{key}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">REAL DATA SOURCES</p>
            <h2>What this page is measuring</h2>
          </div>
          <span className="data-badge">Persisted</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="luxury-stat"><span>Cash balance</span><strong>{account.currency} {account.cashBalance.toLocaleString()}</strong></div>
          <div className="luxury-stat"><span>Total P&L</span><strong>{account.currency} {account.totalPnl.toLocaleString()}</strong></div>
          <div className="luxury-stat"><span>Open positions</span><strong>{positions.filter((item) => item.quantity !== 0).length}</strong></div>
          <div className="luxury-stat"><span>Closed positions</span><strong>{closed.length}</strong></div>
        </div>
      </section>
    </main>
  );
}
