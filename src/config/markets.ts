import type { MarketInstrument } from "@/types/market";
export const supportedMarkets = [
  { id: "india", label: "Indian Markets", description: "NSE and BSE intelligence foundation", enabled: true },
  { id: "crypto", label: "Crypto", description: "Provider-agnostic digital asset intelligence", enabled: true },
  { id: "forex", label: "Forex", description: "Major and selected cross-currency pairs", enabled: true },
] as const;
export const sampleInstruments: MarketInstrument[] = [
  { id:"nse-nifty50",symbol:"NIFTY 50",displayName:"NIFTY 50",market:"indian-index",exchange:"NSE",currency:"INR",tickSize:0.05,lotSize:1,enabled:true },
  { id:"nse-reliance",symbol:"RELIANCE",displayName:"Reliance Industries",market:"indian-equity",exchange:"NSE",currency:"INR",tickSize:0.05,lotSize:1,enabled:true },
  { id:"crypto-btcusdt",symbol:"BTC/USDT",displayName:"Bitcoin / Tether",market:"crypto",exchange:"Aggregate",currency:"USDT",tickSize:0.01,lotSize:0.00001,enabled:true },
  { id:"fx-eurusd",symbol:"EUR/USD",displayName:"Euro / US Dollar",market:"forex",exchange:"OTC",currency:"USD",tickSize:0.00001,lotSize:1000,enabled:true },
];
