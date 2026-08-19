import type { MarketInstrument } from "@/types/market";

export const marketUniverse: readonly MarketInstrument[] = [
  { id:"nse:NIFTY50", symbol:"NIFTY 50", displayName:"Nifty 50 Index", market:"indian-index", exchange:"NSE", currency:"INR", tickSize:0.05, lotSize:1, enabled:true, providerRequired:true, sector:"Index" },
  { id:"nse:BANKNIFTY", symbol:"BANKNIFTY", displayName:"Nifty Bank Index", market:"indian-index", exchange:"NSE", currency:"INR", tickSize:0.05, lotSize:1, enabled:true, providerRequired:true, sector:"Index" },
  { id:"nse:RELIANCE", symbol:"RELIANCE", displayName:"Reliance Industries", market:"indian-equity", exchange:"NSE", currency:"INR", tickSize:0.05, lotSize:1, enabled:true, providerRequired:true, sector:"Energy" },
  { id:"nse:TCS", symbol:"TCS", displayName:"Tata Consultancy Services", market:"indian-equity", exchange:"NSE", currency:"INR", tickSize:0.05, lotSize:1, enabled:true, providerRequired:true, sector:"Technology" },
  { id:"nse:HDFCBANK", symbol:"HDFCBANK", displayName:"HDFC Bank", market:"indian-equity", exchange:"NSE", currency:"INR", tickSize:0.05, lotSize:1, enabled:true, providerRequired:true, sector:"Financials" },
  { id:"nfo:NIFTY-FUT", symbol:"NIFTY FUT", displayName:"Nifty Futures", market:"indian-futures", exchange:"NFO", currency:"INR", tickSize:0.05, lotSize:25, enabled:true, providerRequired:true, sector:"Derivatives" },
  { id:"nfo:NIFTY-OPT", symbol:"NIFTY OPT", displayName:"Nifty Options Chain", market:"indian-options", exchange:"NFO", currency:"INR", tickSize:0.05, lotSize:25, enabled:true, providerRequired:true, sector:"Derivatives" },
  { id:"mcx:GOLD", symbol:"GOLD", displayName:"Gold Futures", market:"commodity", exchange:"MCX", currency:"INR", tickSize:1, lotSize:1, enabled:true, providerRequired:true, sector:"Metals" },
  { id:"mcx:CRUDEOIL", symbol:"CRUDEOIL", displayName:"Crude Oil Futures", market:"commodity", exchange:"MCX", currency:"INR", tickSize:1, lotSize:100, enabled:true, providerRequired:true, sector:"Energy" },
  { id:"coindcx:B-BTC_USDT", symbol:"BTC/USDT", displayName:"Bitcoin", market:"crypto", exchange:"COINDCX", currency:"USDT", tickSize:0.01, lotSize:0.00001, enabled:true, providerRequired:true, sector:"Crypto" },
  { id:"coindcx:B-ETH_USDT", symbol:"ETH/USDT", displayName:"Ethereum", market:"crypto", exchange:"COINDCX", currency:"USDT", tickSize:0.01, lotSize:0.0001, enabled:true, providerRequired:true, sector:"Crypto" },
  { id:"coindcx:B-SOL_USDT", symbol:"SOL/USDT", displayName:"Solana", market:"crypto", exchange:"COINDCX", currency:"USDT", tickSize:0.001, lotSize:0.001, enabled:true, providerRequired:true, sector:"Crypto" },
  { id:"fx:EURUSD", symbol:"EUR/USD", displayName:"Euro / US Dollar", market:"forex", exchange:"FX", currency:"USD", tickSize:0.00001, lotSize:1000, enabled:true, providerRequired:true, sector:"Forex" },
  { id:"fx:GBPUSD", symbol:"GBP/USD", displayName:"British Pound / US Dollar", market:"forex", exchange:"FX", currency:"USD", tickSize:0.00001, lotSize:1000, enabled:true, providerRequired:true, sector:"Forex" },
  { id:"nasdaq:AAPL", symbol:"AAPL", displayName:"Apple Inc.", market:"us-equity", exchange:"NASDAQ", currency:"USD", tickSize:0.01, lotSize:1, enabled:true, providerRequired:true, sector:"Technology" },
  { id:"nasdaq:MSFT", symbol:"MSFT", displayName:"Microsoft Corp.", market:"us-equity", exchange:"NASDAQ", currency:"USD", tickSize:0.01, lotSize:1, enabled:true, providerRequired:true, sector:"Technology" },
  { id:"nse:NIFTYBEES", symbol:"NIFTYBEES", displayName:"Nippon India ETF Nifty BeES", market:"etf", exchange:"NSE", currency:"INR", tickSize:0.01, lotSize:1, enabled:true, providerRequired:true, sector:"ETF" },
] as const;
