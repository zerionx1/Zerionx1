import { apiError,apiSuccess } from "@/lib/security/api-response";import { getUserBacktest } from "@/lib/backtest/backtest-repository";
export async function GET(_:Request,{params}:{params:Promise<{backtestId:string}>}){const {backtestId}=await params;const result=await getUserBacktest(backtestId);return result?apiSuccess({result}):apiError("NOT_FOUND","Backtest not found",404)}
