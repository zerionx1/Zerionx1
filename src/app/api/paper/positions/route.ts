import { paperStore } from "@/lib/paper/paper-store";
import { quoteStore } from "@/lib/market/quote-store";
import { ok } from "@/lib/security/api-response";

export async function GET() {
  const positions = await paperStore.listPositions();

  const marked = await Promise.all(
    positions.map(async (position) => {
      const quote = await quoteStore.get(position.symbol);
      if (!quote) return position;

      const markPrice = quote.price;
      const unrealizedPnl =
        (markPrice - position.averagePrice) * position.quantity;

      return {
        ...position,
        markPrice,
        unrealizedPnl,
      };
    }),
  );

  return ok(marked);
}
