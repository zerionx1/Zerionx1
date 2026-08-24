"use client";

import type { ComponentProps } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import { zerionTradingViewDatafeed } from "@/lib/tradingview/zerion-datafeed";

type LegacyProps = ComponentProps<typeof ZerionProviderChart>;

type Primitive = {
  setPrice?: (value: number) => Primitive;
  setText?: (value: string) => Primitive;
  remove?: () => void;
};
type TVChart = {
  createPositionLine?: () => Promise<Primitive>;
  createOrderLine?: () => Promise<Primitive>;
};
type TVWidget = {
  remove?: () => void;
  onChartReady?: (callback: () => void) => void;
  chart?: () => TVChart;
};
type TVCtor = new (config: Record<string, unknown>) => TVWidget;

declare global {
  interface Window {
    TradingView?: { widget?: TVCtor };
  }
}

const FULL_LIBRARY_SCRIPT = "/trading_platform/charting_library/charting_library.js";
let loader: Promise<TVCtor> | null = null;

function resolution(tf: string) {
  if (tf === "1m") return "1";
  if (tf === "3m") return "3";
  if (tf === "5m") return "5";
  if (tf === "15m") return "15";
  if (tf === "30m") return "30";
  if (tf === "1h") return "60";
  if (tf === "4h") return "240";
  if (tf === "1d") return "1D";
  return "1W";
}

function loadTradingPlatform(): Promise<TVCtor> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser-only"));
  if (window.TradingView?.widget) return Promise.resolve(window.TradingView.widget);
  if (loader) return loader;

  loader = new Promise<TVCtor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = FULL_LIBRARY_SCRIPT;
    script.async = true;
    script.dataset.zerionTradingview = "full";
    script.onload = () => {
      const Widget = window.TradingView?.widget;
      Widget ? resolve(Widget) : reject(new Error("Trading Platform runtime unavailable"));
    };
    script.onerror = () => reject(new Error("Trading Platform assets are not installed"));
    document.head.appendChild(script);
  }).catch((error) => {
    loader = null;
    throw error;
  });

  return loader;
}

function fallbackSymbol(exchange: string | undefined, symbol: string) {
  const value = symbol.trim().toUpperCase().replaceAll(" ", "");
  if (value === "NIFTY50" || value === "NIFTY") return "NSE:NIFTY";
  if (value === "BANKNIFTY" || value === "NIFTYBANK") return "NSE:BANKNIFTY";
  if (value.includes("USDT")) return `BINANCE:${value}`;
  if (value === "XAUUSD") return "OANDA:XAUUSD";
  if (value === "XAGUSD") return "OANDA:XAGUSD";
  return `${(exchange || "NSE").toUpperCase()}:${value}`;
}

export function TradingViewChartHost(props: LegacyProps) {
  const id = useId();
  const hostId = useMemo(() => `zx-tv-${id.replaceAll(":", "")}`, [id]);
  const fallbackId = `${hostId}-fallback`;
  const widget = useRef<TVWidget | null>(null);
  const primitives = useRef<Primitive[]>([]);
  const [mode, setMode] = useState<"loading" | "full" | "embed" | "legacy">("loading");

  const engine = (process.env.NEXT_PUBLIC_ZERION_CHART_ENGINE || "tradingview").toLowerCase();
  const legacy = engine === "legacy" || engine === "canvas" || engine === "zerion";

  useEffect(() => {
    if (legacy) {
      setMode("legacy");
      return;
    }
    if (!props.instrument) {
      setMode("loading");
      return;
    }

    let cancelled = false;
    let fallbackScript: HTMLScriptElement | null = null;

    const cleanup = () => {
      primitives.current.forEach((primitive) => {
        try { primitive.remove?.(); } catch {}
      });
      primitives.current = [];
      try { widget.current?.remove?.(); } catch {}
      widget.current = null;
      fallbackScript?.remove();
    };

    cleanup();
    setMode("loading");

    void loadTradingPlatform()
      .then((Widget) => {
        if (cancelled) return;
        const instance = new Widget({
          container: hostId,
          library_path: "/trading_platform/charting_library/",
          datafeed: zerionTradingViewDatafeed,
          symbol: props.instrument?.id ?? props.symbol,
          interval: resolution(props.timeframe),
          autosize: true,
          locale: "en",
          timezone: props.instrument?.market?.startsWith("indian-")
            ? "Asia/Kolkata"
            : "Etc/UTC",
          theme: "light",
          client_id: "zerion-x1",
          user_id: "zerion-user",
          enabled_features: ["use_localstorage_for_settings"],
        });
        widget.current = instance;

        instance.onChartReady?.(() => {
          if (cancelled) return;
          setMode("full");
          const chart = instance.chart?.();
          void Promise.all(
            (props.priceLines ?? []).map(async (line) => {
              try {
                const create =
                  line.kind === "entry" ? chart?.createPositionLine : chart?.createOrderLine;
                if (!create || !chart) return;
                const primitive = await create.call(chart);
                const pnl =
                  typeof line.pnl === "number"
                    ? ` · P&L ${line.pnl >= 0 ? "+" : ""}${line.pnl.toFixed(2)}`
                    : "";
                primitive.setPrice?.(line.price);
                primitive.setText?.(`${line.label}${pnl}`);
                primitives.current.push(primitive);
              } catch {
                // Trading primitives require Trading Platform v29+.
              }
            }),
          );
        });
      })
      .catch(() => {
        if (cancelled) return;
        setMode("embed");
        const mount = document.getElementById(fallbackId);
        if (!mount) return;
        mount.innerHTML = "";

        const container = document.createElement("div");
        container.className = "tradingview-widget-container";
        container.style.height = "100%";
        container.style.width = "100%";
        const widgetNode = document.createElement("div");
        widgetNode.className = "tradingview-widget-container__widget";
        widgetNode.style.height = "100%";
        widgetNode.style.width = "100%";
        container.appendChild(widgetNode);
        mount.appendChild(container);

        fallbackScript = document.createElement("script");
        fallbackScript.src =
          "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        fallbackScript.async = true;
        fallbackScript.type = "text/javascript";
        fallbackScript.text = JSON.stringify({
          autosize: true,
          symbol: fallbackSymbol(
            props.instrument?.exchange,
            props.instrument?.symbol ?? props.symbol,
          ),
          interval: resolution(props.timeframe),
          timezone: props.instrument?.market?.startsWith("indian-")
            ? "Asia/Kolkata"
            : "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          allow_symbol_change: true,
          calendar: false,
          support_host: "https://www.tradingview.com",
        });
        container.appendChild(fallbackScript);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [
    fallbackId,
    hostId,
    legacy,
    props.instrument,
    props.priceLines,
    props.symbol,
    props.timeframe,
  ]);

  if (mode === "legacy") return <ZerionProviderChart {...props} />;

  if (!props.instrument) {
    return (
      <div className="zx-tv-error" style={{ minHeight: props.height }}>
        <div>
          <strong>Select an instrument</strong>
          <p>Search NIFTY 50, options, stocks, crypto or forex.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="zx-tradingview-runtime"
      style={{ minHeight: props.height, position: "relative" }}
    >
      {mode === "loading" ? (
        <div className="zx-tv-loader is-loading" aria-label="Loading TradingView">
          <div className="zx-tv-loader-grid" />
          <div className="zx-tv-loader-bar" />
          <div className="zx-tv-loader-bar short" />
        </div>
      ) : null}

      <div
        id={hostId}
        style={{
          display: mode === "full" || mode === "loading" ? "block" : "none",
          minHeight: props.height,
          height: props.height,
        }}
      />
      <div
        id={fallbackId}
        style={{
          display: mode === "embed" ? "block" : "none",
          minHeight: props.height,
          height: props.height,
        }}
      />

      <div className="zx-tv-attribution">
        {mode === "full"
          ? "TradingView Trading Platform · Zerion datafeed"
          : mode === "embed"
            ? "TradingView embed · full Zerion trading needs Trading Platform access"
            : "TradingView"}
      </div>
    </div>
  );
}
