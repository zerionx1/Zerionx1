"use client";

import type { ComponentProps } from "react";
import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";

export function GoChartingChartHost(
  props: ComponentProps<typeof ZerionProviderChart>,
) {
  const goChartingRequested =
    process.env.NEXT_PUBLIC_ZERION_CHART_ENGINE?.toLowerCase() === "gocharting";

  return (
    <div
      className="zx-gocharting-host"
      data-chart-engine={goChartingRequested ? "gocharting-ready" : "zerion-fallback"}
    >
      {goChartingRequested ? (
        <div className="zx-gocharting-attribution">
          Powered by GoCharting · data via Zerion providers
        </div>
      ) : null}
      <ZerionProviderChart {...props} />
    </div>
  );
}
