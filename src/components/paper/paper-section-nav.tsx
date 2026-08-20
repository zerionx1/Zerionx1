"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items=[["Overview","/dashboard/paper/overview"],["Order","/dashboard/paper/order"],["Positions","/dashboard/paper/positions"],["P&L","/dashboard/paper/pnl"],["History","/dashboard/paper/history"],["Account","/dashboard/paper/account"]] as const;
export function PaperSectionNav(){const p=usePathname();return <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">{items.map(([l,h])=><Link key={h} href={h} className={`luxury-filter whitespace-nowrap ${p===h?"luxury-filter--active":""}`}>{l}</Link>)}</nav>}
