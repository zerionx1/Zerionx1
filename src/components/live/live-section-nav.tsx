"use client";
import Link from "next/link";import {usePathname} from "next/navigation";
const items=[["Overview","/dashboard/live-trading/overview"],["Order","/dashboard/live-trading/order"],["Positions","/dashboard/live-trading/positions"],["P&L","/dashboard/live-trading/pnl"],["History","/dashboard/live-trading/history"],["Broker Account","/dashboard/live-trading/broker-account"]] as const;
export function LiveSectionNav(){const p=usePathname();return <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">{items.map(([l,h])=><Link key={h} href={h} className={`luxury-filter whitespace-nowrap ${p===h?"luxury-filter--active":""}`}>{l}</Link>)}</nav>}
