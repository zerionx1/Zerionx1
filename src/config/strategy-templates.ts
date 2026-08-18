export type ZerionStrategyTemplate = {
  id: string;
  name: string;
  market: "indian-index" | "indian-equity" | "forex";
  style: string;
  timeframe: "5m" | "15m" | "30m" | "1h";
  symbol: string;
  description: string;
  rules: string[];
  risk: string;
};

export const zerionStrategyTemplates: ZerionStrategyTemplate[] = [
  {
    id: "nifty-trend-pullback",
    name: "NIFTY Trend Pullback",
    market: "indian-index",
    style: "Trend",
    timeframe: "15m",
    symbol: "NSE:NIFTY50",
    description:
      "Follows the main trend and waits for a controlled pullback before a setup is considered.",
    rules: ["EMA trend", "ADX strength", "VWAP reclaim", "ATR stop"],
    risk: "Default risk cap: 0.75% per trade",
  },
  {
    id: "banknifty-breakout",
    name: "BANK NIFTY Breakout",
    market: "indian-index",
    style: "Breakout",
    timeframe: "5m",
    symbol: "NSE:BANKNIFTY",
    description:
      "Looks for a clean range break with momentum and confirmation instead of chasing every move.",
    rules: ["Range break", "Volume confirmation", "Momentum filter", "ATR stop"],
    risk: "Avoid weak or low-volume breakouts",
  },
  {
    id: "nifty-vwap-reversal",
    name: "NIFTY VWAP Reversal",
    market: "indian-index",
    style: "Intraday reversal",
    timeframe: "5m",
    symbol: "NSE:NIFTY50",
    description:
      "Looks for an extended move, rejection and return toward VWAP with strict invalidation.",
    rules: ["VWAP distance", "RSI stretch", "Rejection candle", "Structure stop"],
    risk: "Disabled when trend strength is extreme",
  },
  {
    id: "equity-volume-breakout",
    name: "Equity Volume Breakout",
    market: "indian-equity",
    style: "Breakout",
    timeframe: "15m",
    symbol: "NSE:RELIANCE",
    description:
      "Uses price structure and relative volume to filter stronger equity breakouts.",
    rules: ["Compression", "Relative volume", "Close above range", "Retest check"],
    risk: "Skip poor-liquidity symbols",
  },
  {
    id: "index-momentum",
    name: "Index Momentum Guard",
    market: "indian-index",
    style: "Momentum",
    timeframe: "15m",
    symbol: "NSE:NIFTY50",
    description:
      "Combines momentum, trend direction and volatility before generating a trade proposal.",
    rules: ["EMA slope", "RSI regime", "ADX filter", "ATR sizing"],
    risk: "Maximum 1% configured strategy risk",
  },
  {
    id: "eurusd-session-break",
    name: "EUR/USD Session Break",
    market: "forex",
    style: "Session breakout",
    timeframe: "15m",
    symbol: "EUR/USD",
    description:
      "Tracks session range structure and waits for a confirmed break with volatility support.",
    rules: ["Session range", "ATR expansion", "Trend filter", "Retest option"],
    risk: "Block entries during abnormal spread conditions",
  },
  {
    id: "gbpusd-trend",
    name: "GBP/USD Trend Follow",
    market: "forex",
    style: "Trend",
    timeframe: "30m",
    symbol: "GBP/USD",
    description:
      "Uses higher-timeframe direction and momentum confirmation for trend continuation setups.",
    rules: ["EMA alignment", "ADX strength", "Momentum confirm", "ATR stop"],
    risk: "Reduce risk around major scheduled events",
  },
  {
    id: "xauusd-momentum",
    name: "Gold Momentum Guard",
    market: "forex",
    style: "Momentum",
    timeframe: "15m",
    symbol: "XAU/USD",
    description:
      "Filters gold momentum setups through trend, volatility and structure confirmation.",
    rules: ["Trend direction", "ATR regime", "Structure break", "Risk-reward gate"],
    risk: "Stricter size cap for high-volatility gold moves",
  },
  {
    id: "eurusd-mean-reversion",
    name: "EUR/USD Mean Reversion",
    market: "forex",
    style: "Mean reversion",
    timeframe: "30m",
    symbol: "EUR/USD",
    description:
      "Waits for a stretched move to lose momentum and return toward value before considering entry.",
    rules: ["Bollinger stretch", "RSI extreme", "Momentum fade", "Value re-entry"],
    risk: "Disabled in strong directional regimes",
  },
  {
    id: "forex-no-trade-defense",
    name: "Forex No-Trade Defense",
    market: "forex",
    style: "Risk filter",
    timeframe: "15m",
    symbol: "EUR/USD",
    description:
      "A defensive template that rejects trades when price, data quality or risk conditions disagree.",
    rules: ["Fresh data", "Spread check", "Trend conflict", "Risk limit"],
    risk: "Outputs NO TRADE when safety gates fail",
  },
];
