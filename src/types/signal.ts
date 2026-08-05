import type { MarketKind } from "@/types/market";
export type SignalBias = "bullish" | "bearish" | "neutral";
export type SignalStatus = "watching" | "ready" | "expired" | "invalidated";
export interface SignalFactor { label: string; score: number; explanation: string; }
export interface TradingSignal {
  id: string; symbol: string; market: MarketKind; timeframe: string;
  bias: SignalBias; confidence: number; quality: "low" | "medium" | "high";
  status: SignalStatus; entryZone: [number, number]; stopLoss: number;
  targets: number[]; riskReward: number; expiresAt: string; generatedAt: string;
  factors: SignalFactor[]; warnings: string[]; modelVersion: string;
  educationalOnly: true;
}
