import Link from "next/link";

import { StrategyTemplateGallery } from "@/components/strategies/strategy-template-gallery";
import { StrategyWorkspaceTabs } from "@/components/strategies/strategy-workspace-tabs";
import { listUserStrategies } from "@/lib/strategy/strategy-repository";

export default async function Page() {
  const strategies = await listUserStrategies();

  return (
    <main className="dashboard-page space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Strategy operating system</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">
            Zerion Strategies
          </h1>
          <p className="mt-3 max-w-2xl text-[#2F2A25]">
            Install ready strategies, run them on provider-backed charts and
            control each runtime with enable, pause and delete actions.
          </p>
        </div>
        <Link
          href="/dashboard/strategies/marketplace"
          className="zx-secondary-action"
        >
          Browse all strategies
        </Link>
      </div>

      <StrategyTemplateGallery />
      <StrategyWorkspaceTabs strategies={strategies} />
    </main>
  );
}
