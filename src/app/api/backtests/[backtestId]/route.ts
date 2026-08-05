import { apiError, apiSuccess } from "@/lib/security/api-response"; import { getBacktest } from "@/lib/backtest/backtest-store";
export async function GET(_:Request,{params}:{params:Promise<{backtestId:string}>}){const {backtestId}=await params;const result=getBacktest(backtestId);return result?apiSuccess({result}):apiError("NOT_FOUND","Backtest not found",404)}
