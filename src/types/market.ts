export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";
export type MarketKind =
  | "indian-equity"
  | "indian-index"
  | "indian-futures"
  | "indian-options"
  | "commodity"
  | "crypto"
  | "forex"
  | "us-equity"
  | "etf";
export type MarketSessionState = "pre-open" | "open" | "closed" | "maintenance" | "always-open";
export type QuoteDirection = "up" | "down" | "flat";

export interface MarketInstrument {
  id: string;
  symbol: string;
  displayName: string;
  market: MarketKind;
  exchange: string;
  currency: string;
  tickSize: number;
  lotSize: number;
  enabled: boolean;
  searchableText?: string;
  sector?: string;
  providerRequired?: boolean;
}

export interface MarketQuote {
  instrumentId: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume?: number;
  timestamp: string;
  direction: QuoteDirection;
  source: "sample" | "provider";
  delayed: boolean;
}

export interface MarketOverviewItem extends MarketInstrument {
  quote: MarketQuote | null;
  availability: "live" | "provider-required" | "unavailable";
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
