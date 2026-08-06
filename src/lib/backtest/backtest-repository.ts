import type { BacktestResult } from "@/types/backtest";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";
type Row=Record<string,unknown>;
export async function listUserBacktests(){const u=await currentUser();return (await select("backtests",`owner_id=eq.${u.id}&order=created_at.desc`)).map(r=>r.result as BacktestResult);}
export async function getUserBacktest(id:string){const u=await currentUser();const r=(await select("backtests",`id=eq.${id}&owner_id=eq.${u.id}&limit=1`))[0];return r?.result as BacktestResult|undefined;}
export async function saveUserBacktest(result:BacktestResult){const u=await currentUser();const existing=(await select("backtests",`id=eq.${result.id}&owner_id=eq.${u.id}&limit=1`))[0];if(existing)await update<Row>("backtests",`id=eq.${result.id}`,{status:result.status,result,updated_at:new Date().toISOString()});else await insert<Row>("backtests",{id:result.id,owner_id:u.id,strategy_id:result.request.strategyId,status:result.status,result});return result;}
