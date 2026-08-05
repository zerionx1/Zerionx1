import type { MarketKind, Timeframe } from "@/types/market";
export type StrategyStatus = "draft" | "validated" | "paper-ready" | "archived";
export type StrategyNodeKind = "source" | "indicator" | "condition" | "risk" | "entry" | "exit" | "logic";
export type StrategyOperator = "gt" | "gte" | "lt" | "lte" | "crosses-above" | "crosses-below" | "equals";
export interface StrategyNode { id:string; kind:StrategyNodeKind; label:string; x:number; y:number; config:Record<string,string|number|boolean>; }
export interface StrategyEdge { id:string; source:string; target:string; sourceHandle?:string; targetHandle?:string; }
export interface StrategyRiskRules { riskPerTradePct:number; maxDailyLossPct:number; maxOpenPositions:number; minRiskReward:number; stopLossMode:"fixed"|"atr"|"structure"; takeProfitMode:"fixed"|"risk-multiple"|"trailing"; }
export interface StrategyDefinition { id:string; ownerId:string; name:string; description:string; markets:MarketKind[]; symbols:string[]; timeframe:Timeframe; status:StrategyStatus; nodes:StrategyNode[]; edges:StrategyEdge[]; risk:StrategyRiskRules; tags:string[]; version:number; createdAt:string; updatedAt:string; }
export interface StrategyVersion { id:string; strategyId:string; version:number; definition:StrategyDefinition; note:string; createdBy:string; createdAt:string; checksum:string; }
export interface StrategyValidationIssue { code:string; severity:"error"|"warning"|"info"; message:string; nodeId?:string; }
export interface StrategyValidationResult { valid:boolean; issues:StrategyValidationIssue[]; checkedAt:string; }
