import { NextRequest } from "next/server"; import { apiError, apiSuccess } from "@/lib/security/api-response"; import { listStrategies, saveStrategy } from "@/lib/strategy/strategy-store"; import { strategySchema } from "@/lib/validation/strategy";
export async function GET(){return apiSuccess({strategies:listStrategies()})}
export async function POST(req:NextRequest){const parsed=strategySchema.safeParse(await req.json());if(!parsed.success)return apiError("VALIDATION_ERROR","Invalid strategy definition",400,parsed.error.flatten());return apiSuccess({strategy:saveStrategy(parsed.data)},201)}
