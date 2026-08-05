export const paperTradingPolicy = {
  defaultStartingBalance: 1_000_000,
  maxOpenOrders: 100,
  maxPositions: 50,
  maxOrderNotionalPercent: 20,
  staleQuoteSeconds: 15,
  slippageBasisPoints: 3,
  commissionBasisPoints: 2,
} as const;
