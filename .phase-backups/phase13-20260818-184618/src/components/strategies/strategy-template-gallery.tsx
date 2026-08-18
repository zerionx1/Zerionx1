import { ShieldCheck, Sparkles } from "lucide-react";
import { zerionStrategyTemplates } from "@/config/strategy-templates";

export function StrategyTemplateGallery() {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Curated starting points</p>
          <h2 className="mt-2 text-2xl font-semibold">6 strategy templates</h2>
        </div>
        <span className="data-badge">Paper-first</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {zerionStrategyTemplates.map((template) => (
          <article className="panel" key={template.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="x1-menu-icon"><Sparkles className="h-4 w-4" /></span>
              <span className="data-badge">{template.market}</span>
            </div>
            <h3 className="mt-5 text-lg font-semibold">{template.name}</h3>
            <p className="mt-2 text-sm text-white/55">{template.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {template.rules.map((rule) => (
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/55" key={rule}>
                  {rule}
                </span>
              ))}
            </div>
            <p className="mt-4 flex gap-2 text-xs text-white/45">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {template.risk}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
