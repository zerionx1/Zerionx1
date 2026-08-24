import "server-only";
import { adminSelect } from "@/lib/supabase/admin-rest";

const CORE = [
  "NIFTY 50","BANKNIFTY","FINNIFTY","MIDCPNIFTY","RELIANCE","HDFCBANK","ICICIBANK","SBIN","TCS","INFY","BHARTIARTL","ITC","LT","AXISBANK","KOTAKBANK","MARUTI","TATAMOTORS","SUNPHARMA","HINDUNILVR","BAJFINANCE",
  "BTC/USDT","ETH/USDT","SOL/USDT","XRP/USDT","BNB/USDT","ADA/USDT","DOGE/USDT","AVAX/USDT","LINK/USDT","DOT/USDT","LTC/USDT","TRX/USDT","UNI/USDT","ATOM/USDT","NEAR/USDT",
  "XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","AUDUSD","NZDUSD","USDCAD","USDCHF","EURGBP","EURJPY","GBPJPY",
];
function add(set:Set<string>,value:unknown){if(typeof value==="string"&&value.trim())set.add(value.trim());if(Array.isArray(value))value.forEach(v=>add(set,v));}
export async function resolveScanUniverse(){
  const set=new Set<string>(CORE);
  const configured=process.env.ZERION_SCAN_SYMBOLS;
  if(configured)configured.split(",").map(v=>v.trim()).filter(Boolean).forEach(v=>set.add(v));
  const [active,watchlists]=await Promise.all([
    adminSelect("agent_opportunities","status=eq.active&select=symbol&limit=300").catch(()=>[]),
    adminSelect("watchlists","select=*&limit=500").catch(()=>[]),
  ]);
  active.forEach(r=>add(set,r.symbol));
  watchlists.forEach(r=>{add(set,r.symbol);add(set,r.symbols);add(set,r.instrument_id);add(set,r.instruments)});
  const max=Math.max(20,Math.min(500,Number(process.env.ZERION_SCAN_MAX_SYMBOLS??120)));
  return [...set].slice(0,max);
}
