import { quoteStore } from "@/lib/market/quote-store";
import { ok } from "@/lib/security/api-response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 50);

  return ok(await quoteStore.list(symbols.length ? symbols : undefined), 200);
}
