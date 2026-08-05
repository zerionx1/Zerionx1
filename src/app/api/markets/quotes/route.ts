import { quoteStore } from "@/lib/market/quote-store";import { ok } from "@/lib/security/api-response";
export async function GET(){return ok(await quoteStore.list(), 200)}
