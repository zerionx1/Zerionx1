import "server-only";
import { quoteStore } from "@/lib/market/quote-store";
export type ScanOpportunity = {
  symbol: string;
  price: number;
  direction: "long-watch" | "short-watch" | "neutral";
  confidence: number;
  reason: string;
  source: string;
  requiresUserApproval: true;
};
export async function deterministicMarketScan(
  symbols: string[],
): Promise<ScanOpportunity[]> {
  const quotes = await quoteStore.list(symbols);
  return quotes
    .map((q) => {
      const m = Number(q.changePercent || 0);
      const abs = Math.abs(m);
      const direction: "long-watch" | "short-watch" | "neutral" =
        m >= 1 ? "long-watch" : m <= -1 ? "short-watch" : "neutral";
      const confidence = Math.min(86, Math.round(50 + abs * 7));
      return {
        symbol: q.symbol,
        price: q.price,
        direction,
        confidence,
        reason:
          direction === "neutral"
            ? "No strong deterministic momentum condition."
            : `${m.toFixed(2)}% session move detected; candidate only, not an execution instruction.`,
        source: q.source,
        requiresUserApproval: true as const,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}
