"use client";

import type { ComponentProps } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import { goChartingZerionDatafeed, goChartingSymbolKey } from "@/lib/gocharting/official-datafeed";

type LegacyProps = ComponentProps<typeof ZerionProviderChart>;
type GoChartInstance = {
  remove?: () => void;
  destroy?: () => void;
  resubscribeAll?: () => void;
};
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

const GOCHARTING_UMD = "https://gocharting.com/sdk/library/index.umd.js";
const SCRIPT_TIMEOUT_MS = 20_000;
let loader: Promise<GoChartingRuntime> | null = null;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "GoCharting initialization failed";
}

function removeLoaderScript() {
  const nodes = new Set<HTMLScriptElement>([
    ...document.querySelectorAll<HTMLScriptElement>('script[data-zerion-gocharting="true"]'),
    ...document.querySelectorAll<HTMLScriptElement>(`script[src="${GOCHARTING_UMD}"]`),
  ]);
  nodes.forEach((node) => node.remove());
}

function loadSdk(force = false): Promise<GoChartingRuntime> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GoCharting requires browser runtime"));
  }

  if (!force && window.GoChartingSDK?.createChart) {
    return Promise.resolve(window.GoChartingSDK);
  }
  if (!force && loader) return loader;

  if (force) {
    loader = null;
    delete window.GoChartingSDK;
    removeLoaderScript();
  }

  loader = new Promise((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      fn();
    };

    const ready = () => {
      finish(() => {
        if (window.GoChartingSDK?.createChart) {
          resolve(window.GoChartingSDK);
        } else {
          loader = null;
          reject(new Error("GoCharting SDK loaded but createChart is unavailable"));
        }
      });
    };

    const fail = () => {
      finish(() => {
        loader = null;
        reject(new Error("GoCharting SDK failed to load from the official CDN"));
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOCHARTING_UMD}"]`,
    );
    if (existing) {
      if (window.GoChartingSDK?.createChart) {
        ready();
        return;
      }
      existing.addEventListener("load", ready, { once: true });
      existing.addEventListener("error", fail, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = GOCHARTING_UMD;
      script.async = true;
      script.dataset.zerionGocharting = "true";
      // Do not set crossOrigin here. GoCharting's official UMD example loads
      // this script directly; forcing anonymous CORS can make a valid CDN
      // response fail before the SDK is evaluated.
      script.addEventListener("load", ready, { once: true });
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
    }

    timeout = setTimeout(() => {
      finish(() => {
        loader = null;
        reject(new Error("GoCharting SDK load timed out"));
      });
    }, SCRIPT_TIMEOUT_MS);
  });

  return loader;
}

function interval(tf: string) {
  return tf === "1h"
    ? "1h"
    : tf === "4h"
      ? "4h"
      : tf === "1d"
        ? "1D"
        : tf === "1w"
          ? "1W"
          : tf;
}

export function GoChartingChartHost(props: LegacyProps) {
  const id = useId();
  const domId = useMemo(() => `zx-gocharting-${id.replaceAll(":", "")}`, [id]);
  const instance = useRef<GoChartInstance | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const engine = (process.env.NEXT_PUBLIC_ZERION_CHART_ENGINE || "gocharting").toLowerCase();
  const legacy = engine === "legacy" || engine === "canvas" || engine === "zerion";

  useEffect(() => {
    if (legacy || !props.instrument) {
      setState("idle");
      return;
    }

    let cancelled = false;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (readyTimer) clearTimeout(readyTimer);
      try {
        instance.current?.remove?.();
        instance.current?.destroy?.();
      } catch {
        // Cleanup must never block navigation.
      }
      instance.current = null;
    };

    void (async () => {
      setState("loading");
      setError("");
      cleanup();

      try {
        const sdk = await loadSdk(retry > 0);
        if (cancelled) return;
        const create = sdk.createChart;
        if (typeof create !== "function") {
          throw new Error("GoCharting createChart is unavailable");
        }

        const licenseKey = process.env.NEXT_PUBLIC_GOCHARTING_LICENSE_KEY?.trim();
        const config: Record<string, unknown> = {
          symbol: goChartingSymbolKey(props.instrument!),
          interval: interval(props.timeframe),
          datafeed: goChartingZerionDatafeed,
          autosize: true,
          theme: "light",
          debugLog: false,
          onReady: () => {
            if (cancelled) return;
            if (readyTimer) clearTimeout(readyTimer);
            readyTimer = null;
            setState("ready");
          },
          onError: (value: unknown) => {
            if (cancelled) return;
            if (readyTimer) clearTimeout(readyTimer);
            readyTimer = null;
            setError(errorMessage(value));
            setState("error");
          },
        };
        if (licenseKey) config.licenseKey = licenseKey;

        instance.current = create(`#${domId}`, config);

        // A blank loader must never be treated as a successful chart. If the
        // SDK does not report ready within a bounded window, surface a real
        // retryable error instead of showing an empty canvas.
        readyTimer = setTimeout(() => {
          if (cancelled) return;
          try {
            instance.current?.remove?.();
            instance.current?.destroy?.();
          } catch {
            // Ignore cleanup errors while surfacing the readiness failure.
          }
          instance.current = null;
          setError("GoCharting loaded but the chart did not become ready in time");
          setState("error");
        }, 12_000);
      } catch (value) {
        console.error("GoCharting initialization failed", value);
        if (!cancelled) {
          setError(errorMessage(value));
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [domId, legacy, props.instrument, props.timeframe, retry]);

  useEffect(() => {
    if (legacy) return;
    const onVisible = () => {
      if (!document.hidden) instance.current?.resubscribeAll?.();
    };
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [legacy]);

  if (legacy) return <ZerionProviderChart {...props} />;

  if (!props.instrument) {
    return (
      <div className="zx-gc-error">
        <div>
          <strong>Select an instrument</strong>
          <p>Choose a provider-backed symbol to open the GoCharting workspace.</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="zx-gc-error" style={{ minHeight: props.height }}>
        <div>
          <strong>GoCharting could not start</strong>
          <p>{error}</p>
          <p>
            Zerion is using the official GoCharting CDN and will not silently fall
            back to the old canvas chart.
          </p>
          <button
            type="button"
            onClick={() => {
              loader = null;
              setRetry((value) => value + 1);
            }}
          >
            Retry GoCharting
          </button>
        </div>
      </div>
    );
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
        <div className="zx-gc-attribution">Powered by GoCharting</div>
      ) : null}
    </div>
  );
}
