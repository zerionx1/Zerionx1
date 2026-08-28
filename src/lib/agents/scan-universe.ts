import "server-only";
import { adminSelect } from "@/lib/supabase/admin-rest";

const INDIA = [
  "NIFTY 50","BANKNIFTY","FINNIFTY","MIDCPNIFTY","RELIANCE","HDFCBANK","ICICIBANK","SBIN","TCS","INFY","BHARTIARTL","ITC","LT","AXISBANK","KOTAKBANK","MARUTI","TATAMOTORS","SUNPHARMA","HINDUNILVR","BAJFINANCE","BAJAJFINSV","ASIANPAINT","ADANIENT","ADANIPORTS","BEL","CIPLA","COALINDIA","DRREDDY","EICHERMOT","ETERNAL","GRASIM","HCLTECH","HEROMOTOCO","HINDALCO","JIOFIN","JSWSTEEL","M&M","NESTLEIND","NTPC","ONGC","POWERGRID","SHRIRAMFIN","TATASTEEL","TECHM","TITAN","TRENT","ULTRACEMCO","WIPRO","INDUSINDBK","APOLLOHOSP","BAJAJ-AUTO"
];
const CRYPTO = ["BTC/USDT","ETH/USDT","SOL/USDT","XRP/USDT","BNB/USDT","ADA/USDT","DOGE/USDT","AVAX/USDT","LINK/USDT","DOT/USDT","LTC/USDT","TRX/USDT","UNI/USDT","ATOM/USDT","NEAR/USDT","SUI/USDT","APT/USDT","ARB/USDT","OP/USDT","FIL/USDT","AAVE/USDT","PEPE/USDT","TON/USDT","ETC/USDT","BCH/USDT"];
const FOREX = ["XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","AUDUSD","NZDUSD","USDCAD","USDCHF","EURGBP","EURJPY","GBPJPY","AUDJPY","EURCHF","GBPCHF"];
const CORE = [...INDIA, ...CRYPTO, ...FOREX];
function add(set:Set<string>,value:unknown){if(typeof value==="string"&&value.trim())set.add(value.trim());if(Array.isArray(value))value.forEach(v=>add(set,v));}
export async function resolveScanUniverse(){
  const set=new Set<string>(CORE);
  const configured=process.env.ZERION_SCAN_SYMBOLS;
  if(configured)configured.split(",").map(v=>v.trim()).filter(Boolean).forEach(v=>set.add(v));
  const [active,watchlists]=await Promise.all([
    adminSelect("agent_opportunities","status=eq.active&select=symbol,analysis&limit=500").catch(()=>[]),
    adminSelect("watchlists","select=*&limit=1000").catch(()=>[]),
  ]);
  active.forEach(r=>{add(set,r.symbol);const analysis=r.analysis&&typeof r.analysis==="object"?r.analysis as Record<string,unknown>:{};const plan=analysis.tradePlan&&typeof analysis.tradePlan==="object"?analysis.tradePlan as Record<string,unknown>:{};add(set,plan.instrumentId);add(set,plan.executionSymbol)});
  watchlists.forEach(r=>{add(set,r.symbol);add(set,r.symbols);add(set,r.instrument_id);add(set,r.instruments)});
  const max=Math.max(50,Math.min(500,Number(process.env.ZERION_SCAN_MAX_SYMBOLS??260)));
  return [...set].slice(0,max);
}
