import type { MarketKind } from "@/types/market";
export interface LivePosition { id:string; connectionId:string; market:MarketKind; symbol:string; quantity:number; averagePrice:number; lastPrice:number; realisedPnl:number; unrealisedPnl:number; updatedAt:string; }
export interface PortfolioAccount { connectionId:string; currency:string; cash:number; availableMargin:number; usedMargin:number; netLiquidation:number; syncedAt:string; }
export interface PortfolioSnapshot { accounts:PortfolioAccount[]; positions:LivePosition[]; totalEquity:number; totalUnrealisedPnl:number; capturedAt:string; }
