import Link from "next/link";
import type { StrategyDefinition } from "@/types/strategy";
import { StrategyList } from "@/components/strategies/strategy-list";

export function StrategyWorkspaceTabs({ strategies }: { strategies: StrategyDefinition[] }) {
  const active = strategies.filter((strategy) => strategy.status !== "archived");
  const deployed = strategies.filter((strategy) => strategy.status === "paper-ready");
  const archived = strategies.filter((strategy) => strategy.status === "archived");
  return <div className="space-y-8">
    <nav className="flex gap-2 overflow-x-auto pb-2">
      <a href="#my-strategies" className="luxury-filter luxury-filter--active">My Strategies</a>
      <a href="#deployed" className="luxury-filter">Deployed</a>
      <Link href="/dashboard/strategies/marketplace" className="luxury-filter">Marketplace</Link>
      <Link href="/dashboard/backtests" className="luxury-filter">Backtests</Link>
      <a href="#archived" className="luxury-filter">Archived</a>
    </nav>
    <section id="my-strategies"><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Private workspace</p><h2 className="mt-2 text-2xl font-semibold">My Strategies</h2></div><span className="data-badge">{active.length} active</span></div>{active.length ? <StrategyList items={active} /> : <Empty title="No private strategies yet" action="Browse marketplace" href="/dashboard/strategies/marketplace" />}</section>
    <section id="deployed"><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Paper-ready systems</p><h2 className="mt-2 text-2xl font-semibold">Deployed</h2></div><span className="data-badge">{deployed.length}</span></div>{deployed.length ? <StrategyList items={deployed} /> : <Empty title="No deployed strategies" action="Validate a strategy" href="/dashboard/strategies" />}</section>
    <section id="archived"><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Strategy archive</p><h2 className="mt-2 text-2xl font-semibold">Archived</h2></div><span className="data-badge">{archived.length}</span></div>{archived.length ? <StrategyList items={archived} /> : <p className="panel text-sm text-white/55">Archived strategies stay available here with their versions and historical backtests.</p>}</section>
  </div>;
}

function Empty({ title, action, href }: { title: string; action: string; href: string }) {
  return <div className="panel"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-2 text-sm text-white/55">Start from a risk-managed template or build your own rule graph.</p><Link href={href} className="mt-5 inline-flex rounded-full border border-amber-100/25 px-5 py-2 text-sm text-amber-50">{action}</Link></div>;
}
