import { apiError,apiSuccess } from "@/lib/security/api-response";
import { getUserStrategy } from "@/lib/strategy/strategy-repository";
import { validateStrategy } from "@/lib/strategy/validator";
import { strategySchema } from "@/lib/validation/strategy";
export async function POST(request:Request,{params}:{params:Promise<{strategyId:string}>}){const {strategyId}=await params;const body=await request.json().catch(()=>null);if(body){const parsed=strategySchema.safeParse(body);if(!parsed.success)return apiError("VALIDATION_ERROR","Invalid strategy definition",400,parsed.error.flatten());return apiSuccess(validateStrategy(parsed.data));}const strategy=await getUserStrategy(strategyId);return strategy?apiSuccess(validateStrategy(strategy)):apiError("NOT_FOUND","Strategy not found",404);}
