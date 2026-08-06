import Link from "next/link";
import { NewStrategyButton } from "@/components/strategies/new-strategy-button";
import { StrategyWorkspaceTabs } from "@/components/strategies/strategy-workspace-tabs";
import { listUserStrategies } from "@/lib/strategy/strategy-repository";

export default async function Page() {
  const strategies = await listUserStrategies();
  return <main className="dashboard-page space-y-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Strategy operating system</p><h1 className="mt-2 text-4xl font-semibold md:text-5xl">Strategy Studio</h1><p className="mt-3 max-w-2xl text-white/55">Build private rule systems, install curated templates, validate versions and move only tested strategies into paper deployment.</p></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/strategies/marketplace" className="rounded-full border border-amber-100/25 px-5 py-3 text-sm text-amber-50">Browse marketplace</Link><NewStrategyButton /></div></div><StrategyWorkspaceTabs strategies={strategies} /></main>;
}
