import { NextRequest } from "next/server";
import { watchlistStore } from "@/lib/watchlists/watchlist-store";
import { fail,ok } from "@/lib/security/api-response";
import type { WatchlistItem } from "@/types/watchlist";

export async function GET(request:NextRequest){const id=request.nextUrl.searchParams.get("id");return ok(id?await watchlistStore.get(id):await watchlistStore.list());}
export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as {
    name?:string;
    description?:string;
    color?:string;
  }|null;

  const name=body?.name?.trim();

  if(!name){
    return fail("VALIDATION_ERROR","Watchlist name is required",400);
  }

  return ok(
    await watchlistStore.create({
      name,
      description:body?.description,
      color:body?.color,
    }),
    201,
  );
}
export async function PATCH(request:Request){const body=await request.json().catch(()=>null) as {id?:string;name?:string;description?:string;color?:string;sortOrder?:number;items?:WatchlistItem[]}|null;if(!body?.id)return fail("VALIDATION_ERROR","Watchlist id is required",400);if(body.items){const saved=await watchlistStore.saveItems(body.id,body.items);return saved?ok(saved):fail("NOT_FOUND","Watchlist not found",404);}const saved=await watchlistStore.rename(body.id,body);return saved?ok(saved):fail("NOT_FOUND","Watchlist not found",404);}
export async function DELETE(request:NextRequest){const id=request.nextUrl.searchParams.get("id");if(!id)return fail("VALIDATION_ERROR","Watchlist id is required",400);try{return ok({deleted:await watchlistStore.delete(id)});}catch(error){return fail("WATCHLIST_DELETE_BLOCKED",error instanceof Error?error.message:"Unable to delete watchlist",409);}}
