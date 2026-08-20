import { paperStore } from "@/lib/paper/paper-store";
import { listUserBacktests } from "@/lib/backtest/backtest-repository";
import { currentUser, select } from "@/lib/supabase/rest";

const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export default async function AnalyticsPage() {
  const user = await currentUser();
  const [account, positions, orders, closures, backtests, deployments] =
    await Promise.all([
      paperStore.getAccount(),
      paperStore.listPositions(),
      paperStore.listOrders(),
      select("paper_trade_closures", `owner_id=eq.${user.id}&order=closed_at.asc`),
      listUserBacktests(),
      select("algo_deployments", `owner_id=eq.${user.id}&order=created_at.desc`),
    ]);

  const realized = closures.map((row) => num(row.realized_pnl));
  const wins = realized.filter((value) => value > 0);
  const losses = realized.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const netPnl = realized.reduce((sum, value) => sum + value, 0);
  const winRate = realized.length ? (wins.length / realized.length) * 100 : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0;
  const expectancy = realized.length ? netPnl / realized.length : 0;
  const open = positions.filter((item) => item.quantity !== 0);
  const openExposure = open.reduce(
    (sum, item) => sum + Math.abs(item.quantity * item.markPrice),
    0,
  );
  const completedBacktests = backtests.filter((item) => item.status === "completed");
  const runningStrategies = deployments.filter((row) => row.status === "active");
  const runtimeErrors = deployments.filter((row) => row.runtime_health === "error");

  const noTradingData =
    orders.length === 0 &&
    closures.length === 0 &&
    open.length === 0 &&
    completedBacktests.length === 0;

  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">REAL SYSTEM ANALYTICS</p>
          <h1>Performance Analytics</h1>
          <p>Paper trades, live system state, strategy runtime and saved backtests only.</p>
        </div>
      </div>

      {noTradingData ? (
        <section className="panel">
          <h2>No performance data yet</h2>
          <p className="mt-2 opacity-60">
            Zerion will not manufacture an equity curve or fake performance. Complete paper/live trades or provider-backed backtests to populate analytics.
          </p>
        </section>
      ) : null}

      <div className="stat-grid">
        {[
          ["Net realized P&L", `${account.currency} ${netPnl.toLocaleString()}`],
          ["Win rate", realized.length ? `${winRate.toFixed(1)}%` : "—"],
          ["Profit factor", realized.length ? (profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)) : "—"],
          ["Expectancy / close", realized.length ? `${account.currency} ${expectancy.toFixed(2)}` : "—"],
          ["Open exposure", `${account.currency} ${openExposure.toLocaleString()}`],
          ["Recorded orders", orders.length],
          ["Completed backtests", completedBacktests.length],
          ["Running strategies", runningStrategies.length],
          ["Runtime errors", runtimeErrors.length],
        ].map(([key, value]) => (
          <div className="stat-tile" key={String(key)}>
            <span>{key}</span><strong>{value}</strong>
          </div>
        ))}
      </div>

      {closures.length ? (
        <section className="panel overflow-x-auto">
          <h2>Closed paper trades</h2>
          <table className="mt-4 w-full min-w-[680px] text-left text-sm">
            <thead><tr><th>Symbol</th><th>Qty</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Closed</th></tr></thead>
            <tbody>
              {closures.map((row) => (
                <tr key={String(row.id)} className="border-t border-black/10">
                  <td className="py-3">{String(row.symbol)}</td>
                  <td>{num(row.quantity)}</td>
                  <td>{num(row.average_price).toLocaleString()}</td>
                  <td>{num(row.exit_price).toLocaleString()}</td>
                  <td>{num(row.realized_pnl).toLocaleString()}</td>
                  <td>{new Date(String(row.closed_at)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}
