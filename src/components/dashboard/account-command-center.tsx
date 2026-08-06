import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, Sparkles, WalletCards } from "lucide-react";
import type { PaperAccount,PaperPosition } from "@/types/paper-trading";
import type { StrategyDefinition } from "@/types/strategy";

export function AccountCommandCenter({account,positions,strategies,alerts,watchlistCount}:{account:PaperAccount;positions:PaperPosition[];strategies:StrategyDefinition[];alerts:number;watchlistCount:number}){
  const setup=[
    {label:"Complete your profile",done:true,href:"/dashboard/settings"},
    {label:"Create your first strategy",done:strategies.length>0,href:"/dashboard/strategies"},
    {label:"Build a market watchlist",done:watchlistCount>0,href:"/dashboard/watchlists"},
    {label:"Place a paper order",done:positions.length>0,href:"/dashboard/paper"},
  ];
  const completed=setup.filter(item=>item.done).length;
  const cards=[
    ["Paper equity",`${account.currency} ${account.equity.toLocaleString()}`],
    ["Available cash",`${account.currency} ${account.cashBalance.toLocaleString()}`],
    ["Buying power",`${account.currency} ${account.buyingPower.toLocaleString()}`],
    ["Total P&L",`${account.currency} ${account.totalPnl.toLocaleString()}`],
  ];
  return <div className="space-y-6">
    <section className="x1-hero-panel">
      <div><span className="x1-kicker"><Sparkles/>Portfolio intelligence</span><h2>Your trading command center</h2><p>One authenticated workspace for research, strategy creation, simulated execution and multi-market readiness.</p></div>
      <div className="x1-hero-value"><span>Portfolio value</span><strong>{account.currency} {account.equity.toLocaleString()}</strong><small className={account.totalPnl>=0?"text-emerald-300":"text-rose-300"}>{account.totalPnl>=0?"+":""}{account.totalPnl.toLocaleString()} all-time</small></div>
    </section>
    <div className="x1-metric-grid">{cards.map(([label,value])=><article className="x1-metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>Synced from your paper account</small></article>)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="x1-luxury-panel"><div className="x1-panel-heading"><div><span className="x1-kicker">Workspace setup</span><h3>{completed} of {setup.length} complete</h3></div><span className="x1-score-ring">{Math.round(completed/setup.length*100)}%</span></div><div className="x1-progress"><span style={{width:`${completed/setup.length*100}%`}}/></div><div className="mt-5 space-y-3">{setup.map(item=><Link className="x1-setup-row" href={item.href} key={item.label}>{item.done?<CheckCircle2 className="text-emerald-300"/>:<Circle/>}<span>{item.label}</span><ArrowUpRight/></Link>)}</div></section>
      <section className="x1-luxury-panel"><div className="x1-panel-heading"><div><span className="x1-kicker">Workspace pulse</span><h3>Live account summary</h3></div><WalletCards/></div><div className="x1-summary-list"><div><span>Open positions</span><strong>{positions.length}</strong></div><div><span>Saved strategies</span><strong>{strategies.length}</strong></div><div><span>Active alerts</span><strong>{alerts}</strong></div><div><span>Watched instruments</span><strong>{watchlistCount}</strong></div></div></section>
    </div>
    <section className="x1-luxury-panel"><div className="x1-panel-heading"><div><span className="x1-kicker">Positions</span><h3>Open paper positions</h3></div><Link href="/dashboard/paper">Open trading desk <ArrowUpRight className="inline h-4 w-4"/></Link></div>{positions.length===0?<div className="x1-empty-state"><WalletCards/><h4>No open paper positions</h4><p>Connect a supported quote provider or use available public crypto quotes, then place your first simulated order.</p><Link href="/dashboard/paper" className="x1-primary-link">Start paper trading</Link></div>:<div className="x1-position-list">{positions.slice(0,5).map(position=><div key={position.id}><div><strong>{position.symbol}</strong><span>{position.market} · Qty {position.quantity}</span></div><div><strong>{account.currency} {position.markPrice.toLocaleString()}</strong><span className={position.unrealizedPnl>=0?"text-emerald-300":"text-rose-300"}>{position.unrealizedPnl.toLocaleString()}</span></div></div>)}</div>}</section>
  </div>
}
