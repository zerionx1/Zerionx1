import { watchlistStore } from "@/lib/watchlists/watchlist-store";import { fail,ok } from "@/lib/security/api-response";import type { WatchlistItem } from "@/types/watchlist";
export async function GET(){return ok(await watchlistStore.getDefault())}
export async function PUT(request:Request){const body=await request.json().catch(()=>null) as {items?:WatchlistItem[]}|null;if(!body||!Array.isArray(body.items))return fail("VALIDATION_ERROR","items must be an array",400);return ok(await watchlistStore.saveItems(body.items));}
