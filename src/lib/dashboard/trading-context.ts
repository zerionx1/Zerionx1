"use client";

export type TradingWorkspaceMode = "paper" | "live";
export type TradingWorkspaceContext = {
  instrumentId?: string;
  symbol?: string;
  market?: string;
  provider?: string;
  side?: "buy" | "sell" | "BUY" | "SELL";
  orderType?: string;
  quantity?: string;
  entryPrice?: string;
  limitPrice?: string;
  triggerPrice?: string;
  stopLoss?: string;
  targetPrice?: string;
  timeframe?: string;
  updatedAt?: string;
};

const key = (mode: TradingWorkspaceMode) => `zerion:workspace:${mode}:v4`;

export function readTradingContext(mode: TradingWorkspaceMode): TradingWorkspaceContext | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(key(mode)) ?? "null");
    return value && typeof value === "object" ? (value as TradingWorkspaceContext) : null;
  } catch {
    return null;
  }
}

export function writeTradingContext(mode: TradingWorkspaceMode, value: TradingWorkspaceContext) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(mode), JSON.stringify({ ...value, updatedAt: new Date().toISOString() }));
  } catch {
    // Storage can be unavailable in private browser modes.
  }
}
