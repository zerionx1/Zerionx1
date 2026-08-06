"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, ShieldCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const destinations = [
  ["Dashboard", "/dashboard"], ["Markets", "/dashboard/markets"], ["Strategies", "/dashboard/strategies"],
  ["Watchlists", "/dashboard/watchlists"], ["Paper Trading", "/dashboard/paper"], ["Backtests", "/dashboard/backtests"],
  ["Portfolio", "/dashboard/portfolio"], ["Reports", "/dashboard/reports"], ["Profile & Account", "/dashboard/account"],
] as const;

export function Topbar(){
  const [query,setQuery]=useState(""); const [open,setOpen]=useState(false); const router=useRouter();
  const matches=useMemo(()=>query.trim()?destinations.filter(([label])=>label.toLowerCase().includes(query.toLowerCase())):destinations.slice(0,6),[query]);
  function submit(){if(matches[0]){router.push(matches[0][1]);setOpen(false);setQuery("");}}
  return <header className="x1-topbar hidden lg:flex">
    <div className="relative max-w-xl flex-1">
      <Search className="absolute left-4 top-3.5 h-4 w-4 text-white/35"/>
      <Input value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onKeyDown={e=>{if(e.key==="Enter")submit();if(e.key==="Escape")setOpen(false)}} className="pl-11" placeholder="Search workspace, markets, strategies…" aria-label="Search workspace"/>
      {open?<div className="x1-search-popover"><div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[.18em] text-white/40"><span>Quick navigation</span><button onClick={()=>setOpen(false)} aria-label="Close search"><X className="h-4 w-4"/></button></div>{matches.map(([label,href])=><Link onClick={()=>setOpen(false)} className="x1-search-result" href={href} key={href}>{label}<span>Open</span></Link>)}</div>:null}
    </div>
    <div className="x1-safe-pill"><ShieldCheck className="h-4 w-4"/>Paper-safe mode</div>
    <Link href="/dashboard/notifications" aria-label="Notifications" className="x1-icon-button"><Bell className="h-4 w-4"/></Link>
    <Link href="/dashboard/account" className="x1-avatar">ZX</Link>
  </header>
}
