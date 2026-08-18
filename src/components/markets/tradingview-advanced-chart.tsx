"use client";

import { memo, useEffect, useId, useRef } from "react";

type Props = {
  symbol: string;
  interval?: string;
  height?: number;
};

function TradingViewAdvancedChartImpl({ symbol, interval = "15", height = 520 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "calc(100% - 26px)";
    widget.style.width = "100%";
    node.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "exchange",
      theme: "dark",
      backgroundColor: "rgba(30, 11, 16, 1)",
      gridColor: "rgba(117, 80, 88, 0.18)",
      style: "1",
      locale: "en",
      withdateranges: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    node.appendChild(script);

    return () => {
      node.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div
      id={`tv-${id}`}
      ref={ref}
      className="tradingview-widget-container overflow-hidden rounded-2xl border border-white/10"
      style={{ height, width: "100%", background: "#1E0B10" }}
    />
  );
}

export const TradingViewAdvancedChart = memo(TradingViewAdvancedChartImpl);
