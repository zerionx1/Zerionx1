export type TradingMode = "paper" | "live";

export type TradingRiskControls = {
  mode: TradingMode;
  dailyProfitTarget: number | null;
  dailyMaxLoss: number | null;
  maxLossPerTrade: number | null;
  riskPerTradePct: number;
  maxOpenPositions: number;
  maxTotalExposure: number | null;
  maxTradesPerDay: number;
  stopAfterDailyLoss: boolean;
  stopAfterDailyTarget: boolean;
  defaultStopLossPct: number | null;
  defaultTakeProfitPct: number | null;
  minRiskReward: number;
  trailingStopEnabled: boolean;
  trailingStopPct: number | null;
  autoPaperExecution: boolean;
};

export type RiskContext = {
  dailyPnl: number;
  openPositions: number;
  totalExposure: number;
  tradesToday: number;
  proposedExposure?: number;
  proposedMaxLoss?: number;
};

export type RiskDecision = {
  allowed: boolean;
  reason?: string;
};
