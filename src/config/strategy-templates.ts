export type ZerionStrategyTemplate = {
  id: string;
  name: string;
  market: "indian-index" | "indian-equity" | "crypto" | "forex";
  style: string;
  timeframe: string;
  description: string;
  rules: string[];
  risk: string;
};

export const zerionStrategyTemplates: ZerionStrategyTemplate[] = [
  {
    id: "trend-pullback",
    name: "Trend Pullback Guard",
    market: "indian-index",
    style: "Trend following",
    timeframe: "15m / 1h",
    description: "Waits for aligned higher-timeframe trend and a controlled pullback before considering entry.",
    rules: ["EMA trend alignment", "ADX trend quality", "VWAP reclaim", "ATR-based invalidation"],
    risk: "Default risk cap 0.75% per paper trade",
  },
  {
    id: "breakout-volume",
    name: "Volume Breakout Confirm",
    market: "indian-equity",
    style: "Breakout",
    timeframe: "5m / 15m",
    description: "Requires range expansion and volume confirmation instead of buying every visible breakout.",
    rules: ["Range compression", "Relative volume expansion", "Close outside structure", "Retest optional"],
    risk: "Avoid low-liquidity instruments",
  },
  {
    id: "crypto-momentum",
    name: "Crypto Momentum Pulse",
    market: "crypto",
    style: "Momentum",
    timeframe: "5m / 15m",
    description: "Uses live crypto data to filter momentum bursts by volatility and confirmation.",
    rules: ["EMA slope", "RSI regime", "Volume impulse", "ATR stop distance"],
    risk: "Maximum 1% simulated account risk",
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion Discipline",
    market: "crypto",
    style: "Mean reversion",
    timeframe: "15m / 1h",
    description: "Looks for statistically stretched moves and requires re-entry into value before acting.",
    rules: ["Z-score stretch", "Bollinger excursion", "Momentum deceleration", "Value re-entry"],
    risk: "Disabled during extreme trend regime",
  },
  {
    id: "forex-session",
    name: "FX Session Structure",
    market: "forex",
    style: "Session breakout",
    timeframe: "15m / 1h",
    description: "Models London/New York session structure with volatility, spread and event-risk gates.",
    rules: ["Session window", "Prior range", "ATR expansion", "Event-risk gate"],
    risk: "Requires licensed/connected FX price feed",
  },
  {
    id: "no-trade-defense",
    name: "No-Trade Defense",
    market: "indian-index",
    style: "Risk filter",
    timeframe: "All",
    description: "A defensive template whose goal is to reject weak setups when evidence conflicts.",
    rules: ["Data freshness", "Timeframe disagreement", "Low liquidity", "Event-risk conflict"],
    risk: "Outputs NO TRADE when safety gates fail",
  },
];
