import { NextRequest } from "next/server";
import { marketOverview } from "@/lib/market/market-catalog";
import { ok } from "@/lib/security/api-response";
import type { MarketKind } from "@/types/market";

export async function GET(request:NextRequest){
  const market=request.nextUrl.searchParams.get("market") as MarketKind|null;
  return ok(await marketOverview(market??undefined));
}
