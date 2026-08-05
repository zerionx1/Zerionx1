import type { MarketKind } from "@/types/market";
export type RiskLevel="low"|"moderate"|"high"|"critical";
export interface PortfolioRiskSnapshot { accountId:string; level:RiskLevel; equity:number; cash:number; grossExposure:number; netExposure:number; leverage:number; dailyLossPct:number; drawdownPct:number; openRiskAmount:number; concentrationPct:number; correlatedExposurePct:number; calculatedAt:string; }
export interface PositionSizingInput { equity:number; riskPct:number; entryPrice:number; stopPrice:number; contractMultiplier?:number; maxPositionPct?:number; }
export interface PositionSizingResult { riskAmount:number; riskPerUnit:number; rawQuantity:number; allowedQuantity:number; notional:number; notionalPct:number; warnings:string[]; }
export interface RiskLimit { id:string; ownerId:string; market?:MarketKind; key:"daily-loss"|"drawdown"|"position-notional"|"open-positions"|"leverage"|"concentration"; value:number; enabled:boolean; hardBlock:boolean; }
export interface KillSwitchState { enabled:boolean; scope:"account"|"strategy"|"platform"; reason:string; enabledBy?:string; enabledAt?:string; }
