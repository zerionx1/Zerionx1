export type ConfidenceBand = "very-low" | "low" | "moderate" | "high" | "very-high";
export type MarketRegime = "trending-up" | "trending-down" | "range" | "volatile" | "illiquid" | "unknown";
export interface NumericSeries { timestamps: number[]; values: number[]; }
export interface OhlcvSeries { timestamps: number[]; open: number[]; high: number[]; low: number[]; close: number[]; volume: number[]; }
export interface SignalFactor { id: string; label: string; score: number; weight: number; explanation: string; source: "technical" | "market-structure" | "risk" | "sentiment" | "liquidity"; }
export interface IntelligenceSignal { id: string; symbol: string; market: string; timeframe: string; direction: "long" | "short" | "neutral"; probability: number; confidenceBand: ConfidenceBand; factors: SignalFactor[]; warnings: string[]; generatedAt: string; expiresAt: string; modelVersion: string; dataFreshnessMs: number; educationalOnly: true; }
export interface IndicatorResult { name: string; values: Array<number | null>; metadata: Record<string, string | number | boolean>; }
