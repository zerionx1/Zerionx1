import { fail,ok } from "@/lib/security/api-response";
import { currentUser,insert,select,update } from "@/lib/supabase/rest";

export async function GET(){
  const user=await currentUser();
  let rows=await select("profiles",`id=eq.${user.id}&limit=1`);
  if(!rows[0]) rows=await insert<Record<string,unknown>>("profiles",{id:user.id,full_name:user.name});
  return ok(rows[0]);
}

export async function PUT(request:Request){
  const user=await currentUser();
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return fail("VALIDATION_ERROR","Invalid profile",400);
  const risk=String(body.risk_profile??"balanced");
  if(!["conservative","balanced","aggressive"].includes(risk))return fail("VALIDATION_ERROR","Invalid risk profile",400);
  const payload={
    full_name:String(body.full_name??"").trim(),
    timezone:String(body.timezone??"Asia/Kolkata"),
    base_currency:String(body.base_currency??"INR"),
    risk_profile:risk,
    onboarding_completed:Boolean(body.onboarding_completed),
    preferences:typeof body.preferences==="object"&&body.preferences?body.preferences:{},
    updated_at:new Date().toISOString(),
  };
  let rows=await update<Record<string,unknown>>("profiles",`id=eq.${user.id}`,payload);
  if(!rows[0])rows=await insert<Record<string,unknown>>("profiles",{id:user.id,...payload});
  return ok(rows[0]);
}
