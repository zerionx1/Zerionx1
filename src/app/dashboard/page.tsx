import { DisclaimerStrip } from "@/components/dashboard/disclaimer-strip";
import { AccountCommandCenter } from "@/components/dashboard/account-command-center";
import { paperStore } from "@/lib/paper/paper-store";
import { listUserStrategies } from "@/lib/strategy/strategy-repository";
import { alertStore } from "@/lib/alerts/alert-store";
import { watchlistStore } from "@/lib/watchlists/watchlist-store";
export default async function DashboardPage(){const [account,positions,strategies,alerts,watchlist]=await Promise.all([paperStore.getAccount(),paperStore.listPositions(),listUserStrategies(),alertStore.list(),watchlistStore.getDefault()]);return <main className="dashboard-page"><div className="page-heading"><div><p className="eyebrow">Authenticated account overview</p><h1>Market Command Center</h1><p>Your persisted paper account, positions, strategies, alerts and workflows in one place.</p></div><span className="status-pill">Execution requires confirmation</span></div><DisclaimerStrip/><AccountCommandCenter account={account} positions={positions} strategies={strategies} alerts={alerts.length} watchlistCount={watchlist.items.length}/></main>;}
