"use client";

import type { ComponentProps } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import {
  goChartingSymbolKey,
  goChartingZerionDatafeed,
} from "@/lib/gocharting/official-datafeed";

type LegacyProps = ComponentProps<typeof ZerionProviderChart>;
type GoChartInstance = {
  remove?: () => void;
  destroy?: () => void;
  resubscribeAll?: () => void;
};
type CreateChart = (
  target: string | HTMLElement,
  config: Record<string, unknown>,
) => GoChartInstance;
type GoChartingRuntime = { createChart?: CreateChart };

declare global {
  interface Window {
    GoChartingSDK?: GoChartingRuntime;
  }
}

const GOCHARTING_PROXY = "/api/gocharting/sdk";
const SCRIPT_TIMEOUT_MS = 20_000;
let loader: Promise<CreateChart> | null = null;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "GoCharting initialization failed";
}

function removeSdkScripts() {
  document
    .querySelectorAll<HTMLScriptElement>('script[data-zerion-gocharting="true"]')
    .forEach((node) => node.remove());
}

function loadCreateChart(force = false): Promise<CreateChart> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GoCharting requires browser runtime"));
  }

  if (!force && typeof window.GoChartingSDK?.createChart === "function") {
    return Promise.resolve(window.GoChartingSDK.createChart);
  }
  if (!force && loader) return loader;

  if (force) {
    loader = null;
    delete window.GoChartingSDK;
    removeSdkScripts();
  }

  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.zerionGocharting = "true";
    script.src = `${GOCHARTING_PROXY}?v=${force ? Date.now() : "1"}`;

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };

    script.addEventListener(
      "load",
      () => {
        finish(() => {
          const createChart = window.GoChartingSDK?.createChart;
          if (typeof createChart === "function") {
            resolve(createChart);
          } else {
            loader = null;
            reject(
              new Error(
                "Official GoCharting SDK loaded through Zerion, but createChart is unavailable",
              ),
            );
          }
        });
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => {
        finish(() => {
          loader = null;
          reject(
            new Error(
              "Zerion could not fetch the official GoCharting SDK. Check /api/gocharting/sdk for the upstream status.",
            ),
          );
        });
      },
      { once: true },
    );

    document.head.appendChild(script);

    const timeout = window.setTimeout(() => {
      finish(() => {
        loader = null;
        script.remove();
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
  const observer = useRef<MutationObserver | null>(null);
  const readyRef = useRef(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const engine = (
    process.env.NEXT_PUBLIC_ZERION_CHART_ENGINE || "gocharting"
  ).toLowerCase();
  const legacy =
    engine === "legacy" || engine === "canvas" || engine === "zerion";

  useEffect(() => {
    const instrument = props.instrument;
    if (legacy || !instrument) {
      setState("idle");
      return;
    }

    let cancelled = false;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;
    readyRef.current = false;

    const cleanup = () => {
      if (readyTimer) clearTimeout(readyTimer);
      if (frame) cancelAnimationFrame(frame);
      observer.current?.disconnect();
      observer.current = null;
      try {
        instance.current?.remove?.();
        instance.current?.destroy?.();
      } catch {
        // Navigation cleanup must not block the page.
      }
      instance.current = null;
    };

    const markReady = () => {
      if (cancelled || readyRef.current) return;
      readyRef.current = true;
      if (readyTimer) clearTimeout(readyTimer);
      readyTimer = null;
      setState("ready");
    };

    void (async () => {
      setState("loading");
      setError("");
      cleanup();

      try {
        const createChart = await loadCreateChart(retry > 0);
        if (cancelled) return;

        const host = document.getElementById(domId);
        if (!host) throw new Error("GoCharting chart container is unavailable");

        observer.current = new MutationObserver(() => {
          if (host.childElementCount > 0) markReady();
        });
        observer.current.observe(host, { childList: true, subtree: true });

        const licenseKey =
          process.env.NEXT_PUBLIC_GOCHARTING_LICENSE_KEY?.trim();
        const config: Record<string, unknown> = {
          symbol: goChartingSymbolKey(instrument),
          interval: interval(props.timeframe),
          datafeed: goChartingZerionDatafeed,
          autosize: true,
          theme: "light",
          debugLog: false,
          onReady: markReady,
          onError: (value: unknown) => {
            if (cancelled) return;
            if (readyTimer) clearTimeout(readyTimer);
            readyTimer = null;
            setError(errorMessage(value));
            setState("error");
          },
        };
        if (licenseKey) config.licenseKey = licenseKey;

        instance.current = createChart(`#${domId}`, config);

        frame = requestAnimationFrame(() => {
          if (host.childElementCount > 0) markReady();
        });

        readyTimer = setTimeout(() => {
          if (cancelled || readyRef.current) return;
          if (host.childElementCount > 0) {
            markReady();
            return;
          }
          setError(
            "GoCharting SDK loaded, but the chart did not render. If the SDK reports a license requirement, configure NEXT_PUBLIC_GOCHARTING_LICENSE_KEY.",
          );
          setState("error");
        }, 15_000);
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
    const resubscribe = () => {
      if (!document.hidden) instance.current?.resubscribeAll?.();
    };
    window.addEventListener("online", resubscribe);
    document.addEventListener("visibilitychange", resubscribe);
    return () => {
      window.removeEventListener("online", resubscribe);
      document.removeEventListener("visibilitychange", resubscribe);
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
        className={
          state === "loading" ? "zx-gc-loader is-loading" : "zx-gc-loader"
        }
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
