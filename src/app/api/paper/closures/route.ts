import { currentUser,select } from "@/lib/supabase/rest";
import { ok,fail } from "@/lib/security/api-response";
export async function GET(){try{const u=await currentUser();return ok(await select("paper_trade_closures",`owner_id=eq.${u.id}&order=closed_at.desc&limit=500`))}catch(e){return fail("PAPER_HISTORY_FAILED",e instanceof Error?e.message:"Could not load paper history",500)}}
