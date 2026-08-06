import type { PriceAlert } from "@/types/alert";
import { currentUser, insert, select, update, remove } from "@/lib/supabase/rest";
type Row=Record<string,unknown>;
const map=(r:Row):PriceAlert=>({id:String(r.id),userId:String(r.owner_id),symbol:String(r.symbol),operator:r.operator as PriceAlert["operator"],threshold:Number(r.threshold),status:r.status as PriceAlert["status"],channels:r.channels as PriceAlert["channels"],createdAt:String(r.created_at),triggeredAt:r.triggered_at?String(r.triggered_at):undefined});
export const alertStore={
 async list(){const u=await currentUser();return (await select("price_alerts",`owner_id=eq.${u.id}&order=created_at.desc`)).map(map);},
 async create(input:Omit<PriceAlert,"id"|"userId"|"createdAt">){const u=await currentUser();return map((await insert<Row>("price_alerts",{owner_id:u.id,symbol:input.symbol,operator:input.operator,threshold:input.threshold,status:input.status,channels:input.channels}))[0]!);},
 async setStatus(id:string,status:PriceAlert["status"]){const u=await currentUser();const rows=await update<Row>("price_alerts",`id=eq.${id}&owner_id=eq.${u.id}`,{status,updated_at:new Date().toISOString()});return rows[0]?map(rows[0]):null;},
 async delete(id:string){const u=await currentUser();await remove("price_alerts",`id=eq.${id}&owner_id=eq.${u.id}`);}
};
