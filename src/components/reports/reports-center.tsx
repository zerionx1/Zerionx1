import Link from "next/link";
import { Activity, ArrowUpRight, BookOpenCheck, FileBarChart2, ShieldCheck, WalletCards } from "lucide-react";
const reports=[
 ["Portfolio performance","Account equity, P&L and position exposure","/dashboard/portfolio",WalletCards],
 ["Strategy & backtest reports","Saved tests, trade metrics and version history","/dashboard/backtests",FileBarChart2],
 ["Trade journal","Document decisions, outcomes and learning notes","/dashboard/journal",BookOpenCheck],
 ["Risk & compliance","Risk controls, approvals and account safety events","/dashboard/risk",ShieldCheck],
 ["Activity history","Authenticated workspace actions and system events","/activity",Activity],
] as const;
export function ReportsCenter(){return <div className="grid gap-5 md:grid-cols-2">{reports.map(([title,description,href,Icon])=><Link className="x1-report-card" href={href} key={title}><span className="x1-menu-icon"><Icon/></span><div><strong>{title}</strong><p>{description}</p></div><ArrowUpRight/></Link>)}</div>}
