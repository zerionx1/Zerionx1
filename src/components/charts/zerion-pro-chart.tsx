"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/types/market";

type IndicatorKey = "sma20" | "ema20" | "vwap" | "volume";
type Style = "candles" | "line";

type Props = {
  candles: Candle[];
  symbol?: string;
  timeframe?: string;
  height?: number;
  livePrice?: number | null;
};

type Point = { x: number; y: number };

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function sma(candles: Candle[], period: number) {
  return candles.map((_, i) => {
    if (i + 1 < period) return null;
    return average(candles.slice(i + 1 - period, i + 1).map((c) => c.close));
  });
}

function ema(candles: Candle[], period: number) {
  if (!candles.length) return [];
  const k = 2 / (period + 1);
  let last = candles[0]!.close;
  return candles.map((c, i) => {
    last = i === 0 ? c.close : c.close * k + last * (1 - k);
    return last;
  });
}

function vwap(candles: Candle[]) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  return candles.map((c) => {
    const volume = Math.max(0, Number(c.volume ?? 0));
    const typical = (c.high + c.low + c.close) / 3;
    cumulativePV += typical * volume;
    cumulativeVolume += volume;
    return cumulativeVolume ? cumulativePV / cumulativeVolume : typical;
  });
}

function compact(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function ZerionProChart({
  candles,
  symbol = "Instrument",
  timeframe = "15m",
  height = 560,
  livePrice = null,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<Style>("candles");
  const [indicators, setIndicators] = useState<Set<IndicatorKey>>(
    new Set(["volume"]),
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(90);
  const [pan, setPan] = useState(0);
  const drag = useRef<{ x: number; pan: number } | null>(null);

  const visible = useMemo(() => {
    if (!candles.length) return [];
    const count = Math.max(20, Math.min(240, visibleCount));
    const end = Math.max(
      count,
      Math.min(candles.length, candles.length - Math.round(pan)),
    );
    return candles.slice(Math.max(0, end - count), end);
  }, [candles, pan, visibleCount]);

  const sma20 = useMemo(() => sma(visible, 20), [visible]);
  const ema20 = useMemo(() => ema(visible, 20), [visible]);
  const vwapSeries = useMemo(() => vwap(visible), [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !visible.length) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stage.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;
    ctx.scale(dpr, dpr);

    const palette = {
      bg: "#151a1d",
      grid: "rgba(255,255,255,.075)",
      text: "rgba(245,239,228,.62)",
      up: "#5fd4aa",
      down: "#e98484",
      wick: "rgba(245,239,228,.72)",
      price: "#efe1c9",
      cross: "rgba(255,255,255,.28)",
      sma: "#d5b56f",
      ema: "#8fc7ff",
      vwap: "#c59cff",
      volumeUp: "rgba(95,212,170,.28)",
      volumeDown: "rgba(233,132,132,.24)",
    };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const top = 26;
    const right = 72;
    const bottom = indicators.has("volume") ? 118 : 40;
    const left = 8;
    const chartW = width - left - right;
    const chartH = height - top - bottom;

    const lows = visible.map((c) => c.low);
    const highs = visible.map((c) => c.high);
    if (livePrice) {
      lows.push(livePrice);
      highs.push(livePrice);
    }
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const pad = Math.max((max - min) * 0.08, Math.abs(max) * 0.0005, 0.01);
    const lo = min - pad;
    const hi = max + pad;
    const range = hi - lo || 1;

    const x = (i: number) =>
      left + ((i + 0.5) / Math.max(1, visible.length)) * chartW;
    const y = (value: number) => top + ((hi - value) / range) * chartH;

    ctx.font = "11px system-ui";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 6; i++) {
      const yy = top + (chartH / 6) * i;
      const value = hi - (range / 6) * i;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(width - right, yy);
      ctx.stroke();
      ctx.fillStyle = palette.text;
      ctx.fillText(compact(value), width - right + 8, yy + 4);
    }

    const timeLines = Math.min(7, visible.length);
    for (let i = 0; i < timeLines; i++) {
      const index = Math.round(
        (i / Math.max(1, timeLines - 1)) * (visible.length - 1),
      );
      const xx = x(index);
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(xx, top);
      ctx.lineTo(xx, height - bottom + 4);
      ctx.stroke();
      const stamp = new Date(visible[index]!.time);
      ctx.fillStyle = palette.text;
      ctx.fillText(
        stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        Math.max(left, xx - 24),
        height - 12,
      );
    }

    const slot = chartW / Math.max(1, visible.length);
    const bodyW = Math.max(2, Math.min(12, slot * 0.64));

    if (style === "candles") {
      visible.forEach((c, i) => {
        const xx = x(i);
        const up = c.close >= c.open;
        ctx.strokeStyle = up ? palette.up : palette.down;
        ctx.fillStyle = up ? palette.up : palette.down;
        ctx.beginPath();
        ctx.moveTo(xx, y(c.high));
        ctx.lineTo(xx, y(c.low));
        ctx.stroke();
        const y1 = y(c.open);
        const y2 = y(c.close);
        ctx.fillRect(
          xx - bodyW / 2,
          Math.min(y1, y2),
          bodyW,
          Math.max(1.5, Math.abs(y2 - y1)),
        );
      });
    } else {
      ctx.strokeStyle = palette.price;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      visible.forEach((c, i) => {
        const xx = x(i);
        const yy = y(c.close);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    function drawSeries(
      values: Array<number | null>,
      color: string,
      width = 1.25,
    ) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      let started = false;
      values.forEach((value, i) => {
        if (value == null || !Number.isFinite(value)) return;
        if (!started) {
          ctx.moveTo(x(i), y(value));
          started = true;
        } else {
          ctx.lineTo(x(i), y(value));
        }
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    if (indicators.has("sma20")) drawSeries(sma20, palette.sma);
    if (indicators.has("ema20")) drawSeries(ema20, palette.ema);
    if (indicators.has("vwap")) drawSeries(vwapSeries, palette.vwap);

    if (indicators.has("volume")) {
      const volumeTop = height - 95;
      const volumeBottom = height - 30;
      const maxVolume = Math.max(
        ...visible.map((c) => Number(c.volume ?? 0)),
        1,
      );
      visible.forEach((c, i) => {
        const volume = Number(c.volume ?? 0);
        const h = (volume / maxVolume) * (volumeBottom - volumeTop);
        ctx.fillStyle =
          c.close >= c.open ? palette.volumeUp : palette.volumeDown;
        ctx.fillRect(x(i) - bodyW / 2, volumeBottom - h, bodyW, h);
      });
      ctx.fillStyle = palette.text;
      ctx.fillText("VOL", left + 4, volumeTop + 10);
    }

    if (livePrice && livePrice >= lo && livePrice <= hi) {
      const yy = y(livePrice);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = palette.price;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(width - right, yy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = palette.price;
      ctx.fillRect(width - right, yy - 10, right, 20);
      ctx.fillStyle = "#191c1f";
      ctx.fillText(compact(livePrice), width - right + 6, yy + 4);
    }

    if (hoverIndex != null && visible[hoverIndex]) {
      const xx = x(hoverIndex);
      const candle = visible[hoverIndex]!;
      const yy = y(candle.close);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = palette.cross;
      ctx.beginPath();
      ctx.moveTo(xx, top);
      ctx.lineTo(xx, height - 28);
      ctx.moveTo(left, yy);
      ctx.lineTo(width - right, yy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    ema20,
    height,
    hoverIndex,
    indicators,
    livePrice,
    sma20,
    style,
    visible,
    vwapSeries,
  ]);

  const hovered =
    hoverIndex != null && visible[hoverIndex]
      ? visible[hoverIndex]
      : visible[visible.length - 1];

  function toggleIndicator(key: IndicatorKey) {
    setIndicators((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a1d]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <strong className="mr-2 text-sm">{symbol}</strong>
        <span className="rounded-md border border-white/10 px-2 py-1">
          {timeframe}
        </span>
        <button
          type="button"
          onClick={() => setStyle(style === "candles" ? "line" : "candles")}
          className="rounded-md border border-white/10 px-2 py-1"
        >
          {style === "candles" ? "Candles" : "Line"}
        </button>
        {(["sma20", "ema20", "vwap", "volume"] as IndicatorKey[]).map((key) => (
          <button
            type="button"
            key={key}
            onClick={() => toggleIndicator(key)}
            className={`rounded-md border px-2 py-1 ${
              indicators.has(key)
                ? "border-amber-100/35 bg-amber-100/10"
                : "border-white/10"
            }`}
          >
            {key === "sma20"
              ? "SMA 20"
              : key === "ema20"
                ? "EMA 20"
                : key.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setVisibleCount(90);
            setPan(0);
          }}
          className="ml-auto rounded-md border border-white/10 px-2 py-1"
        >
          Reset
        </button>
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/5 px-3 py-1.5 text-[11px] text-white/55">
        {hovered ? (
          <>
            <span>{new Date(hovered.time).toLocaleString()}</span>
            <span>O {compact(hovered.open)}</span>
            <span>H {compact(hovered.high)}</span>
            <span>L {compact(hovered.low)}</span>
            <span>C {compact(hovered.close)}</span>
            <span>V {compact(Number(hovered.volume ?? 0))}</span>
          </>
        ) : (
          <span>No candles</span>
        )}
      </div>

      <div
        ref={stageRef}
        className="relative w-full touch-none select-none"
        style={{ height }}
        onWheel={(event) => {
          event.preventDefault();
          setVisibleCount((current) =>
            Math.max(20, Math.min(240, current + (event.deltaY > 0 ? 8 : -8))),
          );
        }}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, pan };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const slot = Math.max(1, rect.width / Math.max(20, visible.length));
          const index = Math.max(
            0,
            Math.min(
              visible.length - 1,
              Math.floor(
                ((event.clientX - rect.left) / rect.width) * visible.length,
              ),
            ),
          );
          setHoverIndex(index);

          if (drag.current) {
            setPan(
              drag.current.pan +
                Math.round((drag.current.x - event.clientX) / slot),
            );
          }
        }}
        onPointerUp={(event) => {
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerLeave={() => {
          drag.current = null;
          setHoverIndex(null);
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
