"use client";

import type { ComponentProps } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import { goChartingZerionDatafeed } from "@/lib/gocharting/official-datafeed";

type LegacyProps = ComponentProps<typeof ZerionProviderChart>;

type GoChartingRuntime = {
  createChart?: (
    target: string | HTMLElement,
    config: Record<string, unknown>,
  ) => GoChartInstance;
};

declare global {
  interface Window {
    GoChartingSDK?: GoChartingRuntime;
  }
}

const GOCHARTING_UMD =
  "https://gocharting.com/sdk/library/index.umd.js";

let goChartingLoader: Promise<GoChartingRuntime> | null = null;

function loadGoChartingSdk(): Promise<GoChartingRuntime> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("GoCharting requires browser runtime"),
    );
  }

  if (window.GoChartingSDK?.createChart) {
    return Promise.resolve(window.GoChartingSDK);
  }

  if (goChartingLoader) return goChartingLoader;

  goChartingLoader = new Promise((resolve, reject) => {
    const existing =
      document.querySelector<HTMLScriptElement>(
        `script[src="${GOCHARTING_UMD}"]`,
      );

    const ready = () => {
      if (window.GoChartingSDK?.createChart) {
        resolve(window.GoChartingSDK);
      } else {
        goChartingLoader = null;
        reject(
          new Error(
            "GoCharting SDK loaded but createChart is unavailable",
          ),
        );
      }
    };

    if (existing) {
      if (window.GoChartingSDK?.createChart) {
        ready();
        return;
      }

      existing.addEventListener("load", ready, { once: true });
      existing.addEventListener(
        "error",
        () => {
          goChartingLoader = null;
          reject(new Error("GoCharting SDK failed to load"));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOCHARTING_UMD;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.zerionGocharting = "true";

    script.addEventListener("load", ready, { once: true });
    script.addEventListener(
      "error",
      () => {
        goChartingLoader = null;
        reject(new Error("GoCharting SDK failed to load"));
      },
      { once: true },
    );

    document.head.appendChild(script);
  });

  return goChartingLoader;
}

type GoChartInstance = {
  remove?: () => void;
  destroy?: () => void;
};

function gcInterval(tf: string) {
  return tf === "1h"
    ? "1H"
    : tf === "4h"
      ? "4H"
      : tf === "1d"
        ? "1D"
        : tf === "1w"
          ? "1W"
          : tf;
}

export function GoChartingChartHost(props: LegacyProps) {
  const reactId = useId();
  const domId = useMemo(
    () => `zx-gocharting-${reactId.replaceAll(":", "")}`,
    [reactId],
  );
  const instanceRef = useRef<GoChartInstance | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "fallback"
  >("loading");

  const enabled =
    process.env.NEXT_PUBLIC_ZERION_CHART_ENGINE?.toLowerCase() === "gocharting";

  useEffect(() => {
    if (!enabled || !props.instrument) {
      setState("fallback");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function mount() {
      setState("loading");

      try {
        const sdk = await loadGoChartingSdk();
        if (cancelled) return;

        const createChart = sdk.createChart;
        if (typeof createChart !== "function") {
          throw new Error("GoCharting createChart export is unavailable");
        }

        const licenseKey = process.env.NEXT_PUBLIC_GOCHARTING_LICENSE_KEY;

        const config: Record<string, unknown> = {
          symbol: props.instrument?.symbol ?? props.symbol,
          interval: gcInterval(props.timeframe),
          datafeed: goChartingZerionDatafeed,
          autosize: true,
          theme: "dark",
        };

        if (licenseKey) config.licenseKey = licenseKey;

        const instance = createChart(`#${domId}`, config) as GoChartInstance;
        instanceRef.current = instance;

        // Avoid a flash of third-party UI while fonts/canvas are initializing.
        // This does not hide required attribution after the chart is ready.
        timer = setTimeout(() => {
          if (!cancelled) setState("ready");
        }, 450);
      } catch (error) {
        console.error("GoCharting initialization failed", error);
        if (!cancelled) setState("fallback");
      }
    }

    void mount();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      const instance = instanceRef.current;
      instanceRef.current = null;
      try {
        instance?.remove?.();
        instance?.destroy?.();
      } catch {
        // Safe teardown across SDK versions.
      }
    };
  }, [
    domId,
    enabled,
    props.instrument,
    props.symbol,
    props.timeframe,
  ]);

  if (!enabled || state === "fallback") {
    return <ZerionProviderChart {...props} />;
  }

  return (
    <div className="zx-gocharting-runtime" style={{ minHeight: props.height }}>
      <div
        className={state === "loading" ? "zx-gc-loader is-loading" : "zx-gc-loader"}
        aria-hidden={state !== "loading"}
      >
        <div className="zx-gc-loader-grid" />
        <div className="zx-gc-loader-bar" />
        <div className="zx-gc-loader-bar short" />
      </div>

      <div
        id={domId}
        className={state === "ready" ? "zx-gc-canvas is-ready" : "zx-gc-canvas"}
        style={{ minHeight: props.height }}
      />

      {state === "ready" ? (
        <div className="zx-gc-attribution">
          Powered by GoCharting
        </div>
      ) : null}
    </div>
  );
}
