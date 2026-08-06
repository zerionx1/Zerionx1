import { NextRequest } from "next/server";
import { searchMarketCatalog } from "@/lib/market/market-catalog";
import { ok } from "@/lib/security/api-response";
import type { MarketKind } from "@/types/market";

export async function GET(request:NextRequest){
  const query=request.nextUrl.searchParams.get("q")??"";
  const market=request.nextUrl.searchParams.get("market") as MarketKind|null;
  return ok(searchMarketCatalog(query,market??undefined));
}
