import type { Candle, Timeframe } from "@/types/market";
import { ZerionProChart } from "@/components/charts/zerion-pro-chart";

export function CandlestickChart({
  candles,
  symbol,
  timeframe,
  livePrice,
}: {
  candles: Candle[];
  symbol?: string;
  timeframe?: Timeframe;
  livePrice?: number | null;
}) {
  return (
    <ZerionProChart
      candles={candles}
      symbol={symbol}
      timeframe={timeframe}
      livePrice={livePrice}
      height={500}
    />
  );
}
