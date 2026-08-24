import { currentUser, select } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

const clean=(v:unknown)=>String(v??"").toUpperCase().replaceAll("/","").replaceAll("-","").replaceAll(" ","");
function rec(v:unknown){return v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{}}

export async function GET(request:Request){
  try{
    const user=await currentUser();
    const wanted=clean(new URL(request.url).searchParams.get("symbol")??"");
    if(!wanted)return ok({opportunity:null,proposal:null});
    const[opps,props]=await Promise.all([
      select("agent_opportunities","status=eq.active&order=confidence.desc&limit=200").catch(()=>[]),
      select("trade_proposals",`owner_id=eq.${user.id}&status=in.(executed,executing)&order=created_at.desc&limit=200`).catch(()=>[]),
    ]);
    const opportunity=opps.find(r=>clean(r.symbol)===wanted)??null;
    const proposal=props.find(r=>{const p=rec(r.order_payload);return clean(p.symbol??r.symbol)===wanted})??null;
    return ok({opportunity,proposal});
  }catch(error){return fail("CHART_CONTEXT_FAILED",error instanceof Error?error.message:"Unable to load chart context",400)}
}
