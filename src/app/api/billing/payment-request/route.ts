import { requestPlanUpgrade } from "@/lib/billing/plan-service";
import { ok,fail } from "@/lib/security/api-response";
import type { Plan } from "@/types/entitlements";

export async function POST(request:Request){
  const b=await request.json().catch(()=>null) as {planId?:Plan;utr?:string;payerName?:string;payerUpi?:string;paymentProof?:string}|null;
  if(!b?.planId||!b.utr?.trim())return fail("VALIDATION_ERROR","Plan and UTR/reference number are required",400);
  if(!b.paymentProof?.startsWith("data:image/"))return fail("VALIDATION_ERROR","Payment proof screenshot is required",400);
  if(b.paymentProof.length>1_100_000)return fail("VALIDATION_ERROR","Payment proof is too large",413);
  try{return ok(await requestPlanUpgrade({planId:b.planId,utr:b.utr,payerName:b.payerName,payerUpi:b.payerUpi,paymentProof:b.paymentProof}))}
  catch(e){return fail("PAYMENT_REQUEST_FAILED",e instanceof Error?e.message:"Could not submit payment",400)}
}
