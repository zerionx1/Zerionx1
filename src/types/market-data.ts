export type MarketAssetClass = "equity" | "index" | "future" | "option" | "crypto" | "forex" | "commodity" | "etf";
export type MarketVenue = string;
export type FeedQuality = "live" | "delayed" | "indicative" | "stale" | "unavailable";
export type ConnectionState = "idle" | "connecting" | "connected" | "degraded" | "disconnected" | "blocked";
export type Timeframe = "1s" | "5s" | "15s" | "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";
export interface MarketSymbol { id:string; providerSymbol:string; canonicalSymbol:string; displayName:string; assetClass:MarketAssetClass; venue:MarketVenue; currency:string; timezone:string; priceScale:number; lotSize:number; tickSize:number; enabled:boolean; }
export interface MarketTick { symbolId:string; sequence:number; eventTime:number; receivedAt:number; price:number; size:number; bid?:number; ask?:number; source:string; quality:FeedQuality; }
export interface MarketCandle { symbolId:string; timeframe:Timeframe; openTime:number; closeTime:number; open:number; high:number; low:number; close:number; volume:number; trades:number; complete:boolean; source:string; }
export interface FeedHealth { provider:string; state:ConnectionState; lastEventAt?:number; lagMs?:number; reconnects:number; droppedEvents:number; invalidEvents:number; message?:string; }
export interface MarketDataEnvelope<T> { id:string; provider:string; receivedAt:number; payload:T; schemaVersion:1; }
