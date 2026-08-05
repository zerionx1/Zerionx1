export const chartTimeframes = ["1m","5m","15m","1h","4h","1d"] as const;
export type ChartTimeframe = (typeof chartTimeframes)[number];
