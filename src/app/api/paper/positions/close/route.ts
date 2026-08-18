import { fail, ok } from "@/lib/security/api-response";
import { paperStore } from "@/lib/paper/paper-store";

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as {positionId?:string}|null;
  if(!body?.positionId) return fail("VALIDATION_ERROR","positionId is required",400);
  try{return ok(await paperStore.closePosition(body.positionId))}
  catch(e){return fail("PAPER_EXIT_FAILED",e instanceof Error?e.message:"Could not close paper position",400)}
}
