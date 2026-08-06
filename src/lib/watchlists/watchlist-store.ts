import type { Watchlist, WatchlistItem } from "@/types/watchlist";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";
type Row=Record<string,unknown>;
const map=(r:Row):Watchlist=>({id:String(r.id),userId:String(r.owner_id),name:String(r.name),isDefault:Boolean(r.is_default),items:(r.items??[]) as WatchlistItem[],createdAt:String(r.created_at),updatedAt:String(r.updated_at)});
export const watchlistStore={
 async getDefault(){const u=await currentUser();let rows=await select("watchlists",`owner_id=eq.${u.id}&is_default=eq.true&limit=1`);if(!rows[0])rows=await insert<Row>("watchlists",{owner_id:u.id,name:"Primary Watchlist",is_default:true,items:[]});return map(rows[0]!);},
 async saveItems(items:WatchlistItem[]){const list=await this.getDefault();const rows=await update<Row>("watchlists",`id=eq.${list.id}`,{items,updated_at:new Date().toISOString()});return map(rows[0]!);}
};
