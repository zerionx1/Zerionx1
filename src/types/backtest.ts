import type { MarketKind, Timeframe } from "@/types/market";
export type BacktestStatus="queued"|"running"|"completed"|"failed"|"cancelled";
export interface BacktestAssumptions { initialCapital:number; commissionBps:number; slippageBps:number; latencyMs:number; allowShort:boolean; maxPositionPct:number; }
export interface BacktestRequest { id:string; strategyId:string; strategyVersion:number; market:MarketKind; symbol:string; timeframe:Timeframe; startDate:string; endDate:string; assumptions:BacktestAssumptions; }
export interface BacktestTrade { id:string; side:"long"|"short"; entryTime:string; exitTime:string; entryPrice:number; exitPrice:number; quantity:number; fees:number; pnl:number; pnlPct:number; exitReason:string; }
export interface BacktestMetrics { netProfit:number; netProfitPct:number; grossProfit:number; grossLoss:number; winRate:number; profitFactor:number; maxDrawdown:number; maxDrawdownPct:number; sharpeRatio:number; sortinoRatio:number; expectancy:number; averageTrade:number; averageWinner:number; averageLoser:number; totalTrades:number; exposurePct:number; }
export interface EquityPoint { time:string; equity:number; drawdown:number; }
export interface BacktestResult { id:string; request:BacktestRequest; status:BacktestStatus; metrics?:BacktestMetrics; trades:BacktestTrade[]; equityCurve:EquityPoint[]; warnings:string[]; startedAt?:string; completedAt?:string; error?:string; }
