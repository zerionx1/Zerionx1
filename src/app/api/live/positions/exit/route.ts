import { fail, ok } from "@/lib/security/api-response";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { closeCTraderPosition } from "@/lib/brokers/ctrader-json-client";

type Body={broker:"upstox";segment?:string}|{broker:"ctrader";accountId:string;environment?:"live"|"demo";positionId:string;volume:number};

export async function POST(request:Request){
  const b=await request.json().catch(()=>null) as Body|null;
  if(!b?.broker)return fail("VALIDATION_ERROR","broker is required",400);
  try{
    if(b.broker==="upstox")return ok(await upstoxClient.exitAllPositions(b.segment));
    if(!b.accountId||!b.positionId||!b.volume)return fail("VALIDATION_ERROR","accountId, positionId and volume are required",400);
    return ok(await closeCTraderPosition({accountId:b.accountId,isLive:b.environment!=="demo",positionId:b.positionId,volume:Number(b.volume)}));
  }catch(e){return fail("LIVE_EXIT_FAILED",e instanceof Error?e.message:"Could not exit live position",502)}
}
