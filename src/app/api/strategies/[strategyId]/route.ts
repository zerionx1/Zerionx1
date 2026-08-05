import { apiError, apiSuccess } from "@/lib/security/api-response"; import { getStrategy } from "@/lib/strategy/strategy-store";
export async function GET(_:Request,{params}:{params:Promise<{strategyId:string}>}){const {strategyId}=await params;const strategy=getStrategy(strategyId);return strategy?apiSuccess({strategy}):apiError("NOT_FOUND","Strategy not found",404)}
