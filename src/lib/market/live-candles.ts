import type { Candle, Timeframe } from "@/types/market";
const intervalMap:Record<Timeframe,string>={"1m":"1m","3m":"3m","5m":"5m","15m":"15m","30m":"30m","1h":"1h","4h":"4h","1d":"1d","1w":"1w"};
export async function getLiveCandles(symbol:string,timeframe:Timeframe,limit=500):Promise<Candle[]>{
 const base=process.env.ZERION_MARKET_DATA_BASE_URL;const key=process.env.ZERION_MARKET_DATA_API_KEY;
 if(base){const r=await fetch(`${base.replace(/\/$/,"")}/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`,{headers:key?{Authorization:`Bearer ${key}`}:{},cache:"no-store"});if(r.ok){const body=await r.json();if(Array.isArray(body))return body as Candle[];if(Array.isArray(body.candles))return body.candles as Candle[];}}
 const pair=symbol.replace(/[^A-Za-z0-9]/g,"").toUpperCase();if(pair.endsWith("USDT")){const r=await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${intervalMap[timeframe]}&limit=${Math.min(limit,1000)}`,{cache:"no-store"});if(r.ok){const rows=await r.json() as unknown[][];return rows.map(x=>({time:new Date(Number(x[0])).toISOString(),open:Number(x[1]),high:Number(x[2]),low:Number(x[3]),close:Number(x[4]),volume:Number(x[5])}));}}
 throw new Error(`No live candle provider configured for ${symbol}. Set ZERION_MARKET_DATA_BASE_URL and ZERION_MARKET_DATA_API_KEY.`);
}
