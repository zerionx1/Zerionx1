export type CoinDcxRealtimeQuote = {
  provider: "coindcx";
  symbol: string;
  providerSymbol: string;
  instrumentId: string;
  timestamp: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume?: number;
  bid?: number;
  ask?: number;
  delayed: false;
};

export const COINDCX_PAIRS = {
  "BTC/USDT": "B-BTC_USDT",
  "ETH/USDT": "B-ETH_USDT",
  "SOL/USDT": "B-SOL_USDT",
} as const;

const pairToSymbol = new Map<string, string>(
  Object.entries(COINDCX_PAIRS).map(([symbol, pair]) => [pair, symbol]),
);

const marketToSymbol = new Map<string, string>([
  ["BTCUSDT", "BTC/USDT"],
  ["ETHUSDT", "ETH/USDT"],
  ["SOLUSDT", "SOL/USDT"],
]);

export function coinDcxPairFor(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized.startsWith("B-") && normalized.includes("_"))
    return normalized;
  const display = normalized.includes("/")
    ? normalized
    : normalized.endsWith("USDT")
      ? `${normalized.slice(0, -4)}/USDT`
      : normalized;
  return COINDCX_PAIRS[display as keyof typeof COINDCX_PAIRS];
}

export function coinDcxSymbolFor(value: string) {
  const normalized = value.trim().toUpperCase();

  const configured =
    pairToSymbol.get(normalized) ?? marketToSymbol.get(normalized);

  if (configured) return configured;

  const pairMatch = normalized.match(/^[A-Z]-([^_]+)_(.+)$/);
  if (pairMatch) return `${pairMatch[1]}/${pairMatch[2]}`;

  if (normalized.includes("_")) {
    const [base, ...quote] = normalized.split("_");
    if (base && quote.length) return `${base}/${quote.join("_")}`;
  }

  return normalized;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCoinDcxTicker(
  row: Record<string, unknown>,
): CoinDcxRealtimeQuote | null {
  const market = String(row.market ?? "").toUpperCase();
  const symbol = marketToSymbol.get(market);
  if (!symbol) return null;

  const pair = coinDcxPairFor(symbol);
  if (!pair) return null;

  const price = number(row.last_price);
  if (!(price > 0)) return null;

  const changePercent = number(row.change_24_hour);
  const previousClose =
    changePercent === -100 ? price : price / (1 + changePercent / 100);
  const change = price - previousClose;
  const timestampRaw = number(row.timestamp, Date.now());
  const timestamp =
    timestampRaw < 10_000_000_000 ? timestampRaw * 1000 : timestampRaw;

  return {
    provider: "coindcx",
    symbol,
    providerSymbol: pair,
    instrumentId: `coindcx:${pair}`,
    timestamp: new Date(timestamp).toISOString(),
    price,
    change,
    changePercent,
    previousClose,
    open: previousClose,
    high: number(row.high, price),
    low: number(row.low, price),
    volume: number(row.volume),
    bid: number(row.bid, price),
    ask: number(row.ask, price),
    delayed: false,
  };
}

export function normalizeCoinDcxTrade(
  response: unknown,
  previous?: CoinDcxRealtimeQuote,
): CoinDcxRealtimeQuote | null {
  const envelope = response as { data?: unknown };
  const row = (envelope?.data ?? response) as Record<string, unknown>;
  const pair = String(row.s ?? "").toUpperCase();
  const symbol = coinDcxSymbolFor(pair);
  const providerPair = pair;
  const price = number(row.p);

  if (!providerPair || !(price > 0)) return null;

  const eventTime = number(row.T, Date.now());
  const previousClose = previous?.previousClose ?? price;
  const change = price - previousClose;

  return {
    provider: "coindcx",
    symbol,
    providerSymbol: providerPair,
    instrumentId: `coindcx:${providerPair}`,
    timestamp: new Date(eventTime).toISOString(),
    price,
    change,
    changePercent: previousClose ? (change / previousClose) * 100 : 0,
    previousClose,
    open: previous?.open ?? previousClose,
    high: Math.max(previous?.high ?? price, price),
    low: Math.min(previous?.low ?? price, price),
    volume: previous?.volume,
    bid: previous?.bid,
    ask: previous?.ask,
    delayed: false,
  };
}
