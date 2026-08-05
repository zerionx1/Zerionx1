import type { Candle, MarketQuote, Timeframe } from "@/types/market";
export const sampleQuotes: MarketQuote[] = [
 {instrumentId:"nse-nifty50",symbol:"NIFTY 50",price:24862.4,change:118.2,changePercent:0.48,open:24768.1,high:24904.2,low:24731.3,previousClose:24744.2,volume:0,timestamp:"2026-08-05T10:00:00.000Z",direction:"up",source:"sample",delayed:true},
 {instrumentId:"nse-reliance",symbol:"RELIANCE",price:1472.8,change:-8.4,changePercent:-0.57,open:1484,high:1488.6,low:1468.2,previousClose:1481.2,volume:1240200,timestamp:"2026-08-05T10:00:00.000Z",direction:"down",source:"sample",delayed:true},
 {instrumentId:"crypto-btcusdt",symbol:"BTC/USDT",price:113420,change:920,changePercent:0.82,open:112500,high:114100,low:111980,previousClose:112500,volume:31840,timestamp:"2026-08-05T10:00:00.000Z",direction:"up",source:"sample",delayed:true},
 {instrumentId:"fx-eurusd",symbol:"EUR/USD",price:1.1542,change:0.0018,changePercent:0.16,open:1.1527,high:1.1551,low:1.1519,previousClose:1.1524,timestamp:"2026-08-05T10:00:00.000Z",direction:"up",source:"sample",delayed:true},
];
export function createSampleCandles(base:number, count=48): Candle[] {
 return Array.from({length:count},(_,i)=>{ const wave=Math.sin(i/4)*base*0.008; const drift=i*base*0.00025; const open=base+wave+drift; const close=open+Math.cos(i/3)*base*0.002; return {time:new Date(Date.UTC(2026,7,3,0,i*30)).toISOString(),open,high:Math.max(open,close)+base*0.0015,low:Math.min(open,close)-base*0.0015,close,volume:1000+i*37}; });
}

export function getCandles(_symbol: string, _timeframe: Timeframe, count = 180): Candle[] {
  return createSampleCandles(100, count);
}
