import { AccountCommandCenter } from "@/components/dashboard/account-command-center";
import { paperStore } from "@/lib/paper/paper-store";
import { listUserStrategies } from "@/lib/strategy/strategy-repository";
import { alertStore } from "@/lib/alerts/alert-store";
import { watchlistStore } from "@/lib/watchlists/watchlist-store";
export default async function DashboardPage(){const [account,positions,strategies,alerts,watchlist]=await Promise.all([paperStore.getAccount(),paperStore.listPositions(),listUserStrategies(),alertStore.list(),watchlistStore.getDefault()]);return <main className="dashboard-page x1-page-enter"><div className="page-heading x1-page-heading"><div><p className="eyebrow">Welcome to Zerion X1</p><h1>Market Command Center</h1><p>Multi-market intelligence, disciplined simulation and strategy operations—personalized to your account.</p></div><span className="status-pill">Live data only when verified</span></div><AccountCommandCenter account={account} positions={positions} strategies={strategies} alerts={alerts.length} watchlistCount={watchlist.items.length}/></main>}
