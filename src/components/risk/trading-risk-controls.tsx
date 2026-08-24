"use client";

import { useEffect, useState } from "react";
import type { TradingMode, TradingRiskControls } from "@/types/risk-controls";

const empty = (mode: TradingMode): TradingRiskControls => ({
  mode,
  dailyProfitTarget: null,
  dailyMaxLoss: null,
  maxLossPerTrade: null,
  riskPerTradePct: 1,
  maxOpenPositions: 3,
  maxTotalExposure: null,
  maxTradesPerDay: 20,
  stopAfterDailyLoss: true,
  stopAfterDailyTarget: false,
  defaultStopLossPct: null,
  defaultTakeProfitPct: null,
  minRiskReward: 1.5,
  trailingStopEnabled: false,
  trailingStopPct: null,
  autoPaperExecution: false,
});

export function TradingRiskControlsPanel() {
  const [mode, setMode] = useState<TradingMode>("paper");
  const [value, setValue] = useState<TradingRiskControls>(empty("paper"));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/risk/controls?mode=${mode}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((body) => {
        if (body.data) setValue(body.data as TradingRiskControls);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [mode]);

  const set = <K extends keyof TradingRiskControls>(
    key: K,
    next: TradingRiskControls[K],
  ) => setValue((current) => ({ ...current, [key]: next }));

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/risk/controls", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...value, mode }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Save failed");
      setValue(body.data);
      setMessage(`${mode === "paper" ? "Paper" : "Live"} risk controls saved and enforced.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const num = (
    label: string,
    key:
      | "dailyProfitTarget"
      | "dailyMaxLoss"
      | "maxLossPerTrade"
      | "riskPerTradePct"
      | "maxOpenPositions"
      | "maxTotalExposure"
      | "maxTradesPerDay"
      | "defaultStopLossPct"
      | "defaultTakeProfitPct"
      | "minRiskReward"
      | "trailingStopPct",
  ) => (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      <input
        className="luxury-input"
        type="number"
        step="any"
        value={value[key] ?? ""}
        onChange={(e) =>
          set(
            key,
            (e.target.value === "" ? null : Number(e.target.value)) as never,
          )
        }
      />
    </label>
  );

  return (
    <section className="panel space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["paper", "live"] as TradingMode[]).map((item) => (
          <button
            key={item}
            className={`luxury-filter ${
              mode === item ? "luxury-filter--active" : ""
            }`}
            onClick={() => {
              setMode(item);
              setValue(empty(item));
              setMessage("");
            }}
          >
            {item === "paper" ? "Paper limits" : "Live limits"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {num("Daily profit target", "dailyProfitTarget")}
        {num("Daily maximum loss", "dailyMaxLoss")}
        {num("Maximum loss per trade", "maxLossPerTrade")}
        {num("Risk per trade %", "riskPerTradePct")}
        {num("Maximum open positions", "maxOpenPositions")}
        {num("Maximum total exposure", "maxTotalExposure")}
        {num("Maximum trades per day", "maxTradesPerDay")}
        {num("Default stop loss %", "defaultStopLossPct")}
        {num("Default take profit %", "defaultTakeProfitPct")}
        {num("Minimum risk/reward", "minRiskReward")}
        {num("Trailing-stop %", "trailingStopPct")}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.stopAfterDailyLoss}
            onChange={(e) => set("stopAfterDailyLoss", e.target.checked)}
          />
          Stop trading after daily loss
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.stopAfterDailyTarget}
            onChange={(e) => set("stopAfterDailyTarget", e.target.checked)}
          />
          Stop trading after daily target
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.trailingStopEnabled}
            onChange={(e) => set("trailingStopEnabled", e.target.checked)}
          />
          Enable trailing-stop preference
        </label>
        {mode === "paper" ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.autoPaperExecution}
              onChange={(e) => set("autoPaperExecution", e.target.checked)}
            />
            Permit risk-gated automatic paper execution
          </label>
        ) : null}
      </div>

      <button className="zx-primary-action" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save trading risk controls"}
      </button>
      {message ? <p className="text-sm text-[#2F2A25]">{message}</p> : null}
    </section>
  );
}
