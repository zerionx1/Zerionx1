import "server-only";
import type { Plan } from "@/types/entitlements";
import { getPlan } from "@/config/plans";
import { currentUser,insert,select,update } from "@/lib/supabase/rest";

export async function ensureSubscription(){
  const user=await currentUser();
  const existing=(await select("subscriptions",`owner_id=eq.${user.id}&status=in.(active,trial,pending)&order=created_at.desc&limit=1`))[0];
  if(existing)return existing;
  const now=new Date().toISOString();
  const row={owner_id:user.id,plan_id:"free",status:"active",source:"auto-free",started_at:now,created_at:now,updated_at:now};
  await insert("subscriptions",row);
  return row;
}

export async function getActivePlan(){
  const subscription=await ensureSubscription();
  return {subscription,plan:getPlan(String(subscription.plan_id??"free") as Plan)};
}

export async function requestPlanUpgrade(input:{planId:Plan;utr:string;payerName?:string;payerUpi?:string;paymentProof:string}){
  const user=await currentUser();
  const current=await getActivePlan();
  const plan=getPlan(input.planId);
  if(plan.enterprise||plan.monthlyPriceInr===null)throw new Error("Enterprise requires direct approval");
  if(plan.monthlyPriceInr===0)throw new Error("Free plan does not require payment");
  const amount=plan.launchPriceInr&&plan.launchPriceInr>0?plan.launchPriceInr:plan.monthlyPriceInr;
  const row={owner_id:user.id,plan_id:plan.id,amount_inr:amount,utr:input.utr.trim(),payer_name:input.payerName?.trim()||null,payer_upi:input.payerUpi?.trim()||null,payment_proof_data:input.paymentProof,submitted_from_plan:current.plan.id,requested_plan_name:plan.name,status:"pending",created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  await insert("payment_requests",row);
  return {id:(row as {id?:string}).id,planId:plan.id,status:"pending"};
}

export async function approvePaymentRequest(input:{requestId:string;reviewerId:string}){
  const req=(await select("payment_requests",`id=eq.${input.requestId}&limit=1`))[0];
  if(!req)throw new Error("Payment request not found");
  if(req.status!=="pending")throw new Error("Payment request already reviewed");
  const now=new Date().toISOString();
  await update("payment_requests",`id=eq.${input.requestId}`,{status:"approved",reviewed_by:input.reviewerId,reviewed_at:now,updated_at:now});
  const active=(await select("subscriptions",`owner_id=eq.${String(req.owner_id)}&status=eq.active&order=created_at.desc&limit=1`))[0];
  if(active)await update("subscriptions",`id=eq.${String(active.id)}`,{status:"superseded",updated_at:now});
  const exp=new Date();exp.setMonth(exp.getMonth()+1);
  await insert("subscriptions",{owner_id:req.owner_id,plan_id:req.plan_id,status:"active",source:"manual-upi",payment_request_id:req.id,started_at:now,expires_at:exp.toISOString(),created_at:now,updated_at:now});
  return req;
}
