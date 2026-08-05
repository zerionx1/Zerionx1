import { watchlistStore } from "@/lib/watchlists/watchlist-store";import { ok } from "@/lib/security/api-response";
export async function GET(){return ok(await watchlistStore.getDefault())}
