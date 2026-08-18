"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { planDefinitions } from "@/config/plans";
import type { Plan } from "@/types/entitlements";

const order: Plan[] = ["free","starter","pro","elite","ultra","prime"];

export function UpgradeNudge(){
  const[current,setCurrent]=useState<Plan>("free");
  const[open,setOpen]=useState(false);

  useEffect(()=>{
    void fetch("/api/billing/subscription",{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{
        const id=(j.data?.plan?.id??"free") as Plan;
        setCurrent(id);
        const key=`zerion-upgrade-skip:${id}`;
        const skipped=sessionStorage.getItem(key);
        if(!skipped) setTimeout(()=>setOpen(true),1200);
      });
  },[]);

  const next=useMemo(()=>{
    const i=order.indexOf(current);
    if(i<0||i>=order.length-1)return null;
    return planDefinitions.find(p=>p.id===order[i+1])??null;
  },[current]);

  if(!open||!next)return null;

  const price=next.launchPriceInr&&next.launchPriceInr>0?next.launchPriceInr:next.monthlyPriceInr;

  function skip(){
    sessionStorage.setItem(`zerion-upgrade-skip:${current}`,"1");
    setOpen(false);
  }

  return <aside className="zx-upgrade-popover" role="dialog" aria-label="Upgrade Zerion plan">
    <div className="zx-upgrade-popover__head">
      <div>
        <p className="eyebrow">UPGRADE AVAILABLE</p>
        <h3>{current==="free"?"Unlock more with":`Move beyond ${planDefinitions.find(p=>p.id===current)?.name??current}`} {next.name}</h3>
      </div>
      <button type="button" onClick={skip} aria-label="Skip upgrade popup"><X/></button>
    </div>
    <p>Get the next level of market access, AI usage, strategy capacity and execution limits.</p>
    <div className="zx-upgrade-popover__actions">
      <Link className="zx-primary-action" href={`/dashboard/billing?plan=${next.id}`} onClick={()=>setOpen(false)}>
        Upgrade to {next.name}{price?` · ₹${Number(price).toLocaleString("en-IN")}`:""} <ArrowUpRight className="ml-2 h-4 w-4"/>
      </Link>
      <button type="button" className="zx-secondary-action" onClick={skip}>Not now</button>
    </div>
  </aside>;
}
