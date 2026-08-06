import { apiError,apiSuccess } from "@/lib/security/api-response";import { getUserStrategy } from "@/lib/strategy/strategy-repository";
export async function GET(_:Request,{params}:{params:Promise<{strategyId:string}>}){const {strategyId}=await params;const strategy=await getUserStrategy(strategyId);return strategy?apiSuccess({strategy}):apiError("NOT_FOUND","Strategy not found",404)}
