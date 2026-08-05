import { createSampleCandles } from "@/lib/market/sample-data";import { ok } from "@/lib/security/api-response";
export async function GET(_:Request,{params}:{params:Promise<{instrumentId:string}>}){const {instrumentId}=await params;const base=instrumentId.includes("btc")?112000:24700;return ok({instrumentId,candles:createSampleCandles(base)});}
