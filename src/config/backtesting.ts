export const DEFAULT_BACKTEST_ASSUMPTIONS={initialCapital:100000,commissionBps:5,slippageBps:3,latencyMs:250,allowShort:false,maxPositionPct:20} as const;
export const BACKTEST_LIMITS={maxYears:10,maxTrades:100000,maxConcurrentPerUser:2} as const;
