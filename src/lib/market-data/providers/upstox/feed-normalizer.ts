export type ZerionRealtimeQuote = {
  provider: "upstox";
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

type Ltpc = {
  ltp?: number;
  ltt?: number;
  ltq?: number;
  cp?: number;
};

type Depth = {
  bidP?: number;
  askP?: number;
};

type Ohlc = {
  interval?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  vol?: number;
  ts?: number;
};

type Feed = {
  ltpc?: Ltpc;
  firstLevelWithGreeks?: {
    ltpc?: Ltpc;
    firstDepth?: Depth;
    vtt?: number;
  };
  fullFeed?: {
    marketFF?: {
      ltpc?: Ltpc;
      marketLevel?: { bidAskQuote?: Depth[] };
      marketOHLC?: { ohlc?: Ohlc[] };
      vtt?: number;
    };
    indexFF?: {
      ltpc?: Ltpc;
      marketOHLC?: { ohlc?: Ohlc[] };
    };
  };
};

export const UPSTOX_INSTRUMENTS = {
  "NIFTY 50": "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank",
  RELIANCE: "NSE_EQ|INE002A01018",
  TCS: "NSE_EQ|INE467B01029",
  HDFCBANK: "NSE_EQ|INE040A01034",
} as const;

const reverse = new Map<string, string>(
  Object.entries(UPSTOX_INSTRUMENTS).map(([symbol, key]) => [key, symbol]),
);

export function upstoxInstrumentKeyFor(symbol: string) {
  const normalized = symbol.trim().toUpperCase().replace(/^NSE:/, "");
  return UPSTOX_INSTRUMENTS[normalized as keyof typeof UPSTOX_INSTRUMENTS];
}

export function zerionSymbolForUpstox(instrumentKey: string) {
  return reverse.get(instrumentKey) ?? instrumentKey;
}

function extractLtpc(feed: Feed): Ltpc | undefined {
  return (
    feed.ltpc ??
    feed.firstLevelWithGreeks?.ltpc ??
    feed.fullFeed?.marketFF?.ltpc ??
    feed.fullFeed?.indexFF?.ltpc
  );
}

function extractBidAsk(feed: Feed) {
  const first = feed.firstLevelWithGreeks?.firstDepth;
  const depth = feed.fullFeed?.marketFF?.marketLevel?.bidAskQuote?.[0];
  return {
    bid: first?.bidP ?? depth?.bidP,
    ask: first?.askP ?? depth?.askP,
  };
}

function extractDailyOhlc(feed: Feed) {
  const rows =
    feed.fullFeed?.marketFF?.marketOHLC?.ohlc ??
    feed.fullFeed?.indexFF?.marketOHLC?.ohlc ??
    [];

  return (
    rows.find((row) => {
      const value = String(row.interval ?? "").toLowerCase();
      return value.includes("1d") || value === "d1" || value === "day";
    }) ?? rows[0]
  );
}

export function normalizeUpstoxFeedQuote(
  instrumentKey: string,
  feed: unknown,
  receivedAt = Date.now(),
): ZerionRealtimeQuote {
  const value = feed as Feed;
  const ltpc = extractLtpc(value);

  if (!ltpc || typeof ltpc.ltp !== "number") {
    throw new Error(`Upstox V3 feed has no LTP for ${instrumentKey}`);
  }

  const previousClose =
    typeof ltpc.cp === "number" && ltpc.cp > 0 ? ltpc.cp : ltpc.ltp;
  const change = ltpc.ltp - previousClose;
  const daily = extractDailyOhlc(value);
  const { bid, ask } = extractBidAsk(value);
  const eventTime =
    typeof ltpc.ltt === "number" && ltpc.ltt > 0 ? ltpc.ltt : receivedAt;
  const volume =
    value.firstLevelWithGreeks?.vtt ??
    value.fullFeed?.marketFF?.vtt ??
    daily?.vol;

  return {
    provider: "upstox",
    symbol: zerionSymbolForUpstox(instrumentKey),
    providerSymbol: instrumentKey,
    instrumentId: `upstox:${instrumentKey}`,
    timestamp: new Date(eventTime).toISOString(),
    price: ltpc.ltp,
    change,
    changePercent: previousClose ? (change / previousClose) * 100 : 0,
    previousClose,
    open: typeof daily?.open === "number" ? daily.open : previousClose,
    high:
      typeof daily?.high === "number"
        ? daily.high
        : Math.max(previousClose, ltpc.ltp),
    low:
      typeof daily?.low === "number"
        ? daily.low
        : Math.min(previousClose, ltpc.ltp),
    ...(typeof volume === "number" ? { volume } : {}),
    ...(typeof bid === "number" ? { bid } : {}),
    ...(typeof ask === "number" ? { ask } : {}),
    delayed: false,
  };
}
