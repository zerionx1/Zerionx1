import type { Watchlist, WatchlistItem } from "@/types/watchlist";
import { currentUser, insert, remove, select, update } from "@/lib/supabase/rest";

type Row=Record<string,unknown>;
const map=(row:Row):Watchlist=>({
  id:String(row.id),
  userId:String(row.owner_id),
  name:String(row.name),
  description:typeof row.description==="string"?row.description:undefined,
  color:typeof row.color==="string"?row.color:undefined,
  sortOrder:Number(row.sort_order??0),
  isDefault:Boolean(row.is_default),
  items:Array.isArray(row.items)?row.items as WatchlistItem[]:[],
  createdAt:String(row.created_at),
  updatedAt:String(row.updated_at),
});

async function listRows(){const user=await currentUser();return select("watchlists",`owner_id=eq.${user.id}&order=sort_order.asc,created_at.asc`);}

export const watchlistStore={
  async list(){return (await listRows()).map(map);},
  async get(id:string){const user=await currentUser();const rows=await select("watchlists",`id=eq.${encodeURIComponent(id)}&owner_id=eq.${user.id}&limit=1`);return rows[0]?map(rows[0]):null;},
  async getDefault(){const lists=await this.list();if(lists[0])return lists.find((item)=>item.isDefault)??lists[0];const created=await this.create({name:"Primary Watchlist",description:"Your default multi-market watchlist",color:"champagne"});return created;},
  async create(input:{name:string;description?:string;color?:string}){const user=await currentUser();const lists=await this.list();const rows=await insert<Row>("watchlists",{owner_id:user.id,name:input.name.trim(),description:input.description?.trim()??"",color:input.color??"champagne",sort_order:lists.length,is_default:lists.length===0,items:[]});return map(rows[0]!);},
  async rename(id:string,input:{name?:string;description?:string;color?:string;sortOrder?:number}){const user=await currentUser();const payload:Record<string,unknown>={updated_at:new Date().toISOString()};if(input.name!==undefined)payload.name=input.name.trim();if(input.description!==undefined)payload.description=input.description.trim();if(input.color!==undefined)payload.color=input.color;if(input.sortOrder!==undefined)payload.sort_order=input.sortOrder;const rows=await update<Row>("watchlists",`id=eq.${encodeURIComponent(id)}&owner_id=eq.${user.id}`,payload);return rows[0]?map(rows[0]):null;},
  async delete(id:string){const user=await currentUser();const list=await this.get(id);if(!list)return false;if(list.isDefault)throw new Error("Default watchlist cannot be deleted");await remove("watchlists",`id=eq.${encodeURIComponent(id)}&owner_id=eq.${user.id}`);return true;},
  async saveItems(id:string,items:WatchlistItem[]){const user=await currentUser();const rows=await update<Row>("watchlists",`id=eq.${encodeURIComponent(id)}&owner_id=eq.${user.id}`,{items,updated_at:new Date().toISOString()});return rows[0]?map(rows[0]):null;},
};
