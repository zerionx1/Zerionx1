import Link from "next/link";
import type { PaperAccount,PaperPosition } from "@/types/paper-trading";
import type { StrategyDefinition } from "@/types/strategy";
export function AccountCommandCenter({account,positions,strategies,alerts,watchlistCount}:{account:PaperAccount;positions:PaperPosition[];strategies:StrategyDefinition[];alerts:number;watchlistCount:number}){const cards=[["Paper equity",`${account.currency} ${account.equity.toLocaleString()}`],["Cash",`${account.currency} ${account.cashBalance.toLocaleString()}`],["Open positions",String(positions.length)],["Total P&L",`${account.currency} ${account.totalPnl.toLocaleString()}`],["Strategies",String(strategies.length)],["Active alerts",String(alerts)]];return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value])=><div className="panel" key={label}><span className="text-sm text-white/45">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div><div className="mt-6 grid gap-5 xl:grid-cols-2"><section className="panel"><div className="panel-header"><h2>Workspace actions</h2><span className="data-badge">{watchlistCount} watched</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{([
  ["Trade on paper", "/dashboard/paper"],
  ["Build strategy", "/dashboard/strategies"],
  ["Run backtest", "/dashboard/backtests"],
  ["Open markets", "/dashboard/markets"],
  ["Connect broker", "/dashboard/brokers"],
  ["Review journal", "/dashboard/journal"],
] as const).map(([label, href]) => (
  <Link
    className="rounded-2xl border border-white/10 p-4 hover:bg-white/5"
    href={href}
    key={href}
  >
    {label} →
  </Link>
))}</div></section><section className="panel"><div className="panel-header"><h2>Open paper positions</h2><span className="data-badge">persistent</span></div><div className="mt-4 space-y-3">{positions.length===0?<p className="text-white/55">No positions. Place a provider-priced paper order to start.</p>:positions.slice(0,5).map(position=><div className="flex justify-between gap-4" key={position.id}><div><strong>{position.symbol}</strong><p className="text-sm text-white/50">Qty {position.quantity} · Avg {position.averagePrice}</p></div><span>{position.unrealizedPnl.toLocaleString()}</span></div>)}</div></section></div></>;}
