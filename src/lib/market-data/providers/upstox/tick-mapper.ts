import type { MarketTick } from "@/types/market-data";

type Ltpc = {
  ltp?: number;
  ltt?: number;
  ltq?: number;
};

type Depth = {
  bidP?: number;
  askP?: number;
};

type Feed = {
  ltpc?: Ltpc;
  firstLevelWithGreeks?: {
    ltpc?: Ltpc;
    firstDepth?: Depth;
  };
  fullFeed?: {
    marketFF?: {
      ltpc?: Ltpc;
      marketLevel?: {
        bidAskQuote?: Depth[];
      };
    };
    indexFF?: {
      ltpc?: Ltpc;
    };
  };
};

function extractLtpc(feed: Feed): Ltpc | undefined {
  return (
    feed.ltpc ??
    feed.firstLevelWithGreeks?.ltpc ??
    feed.fullFeed?.marketFF?.ltpc ??
    feed.fullFeed?.indexFF?.ltpc
  );
}

function extractBidAsk(feed: Feed) {
  const firstDepth = feed.firstLevelWithGreeks?.firstDepth;

  if (firstDepth) {
    return {
      bid: firstDepth.bidP,
      ask: firstDepth.askP,
    };
  }

  const depth = feed.fullFeed?.marketFF?.marketLevel?.bidAskQuote?.[0];

  return {
    bid: depth?.bidP,
    ask: depth?.askP,
  };
}

export function mapUpstoxV3FeedToTick(
  instrumentKey: string,
  feed: unknown,
  sequence: number,
  receivedAt = Date.now(),
): MarketTick {
  const value = feed as Feed;
  const ltpc = extractLtpc(value);

  if (!ltpc || typeof ltpc.ltp !== "number") {
    throw new Error(`Upstox V3 feed has no LTP for ${instrumentKey}`);
  }

  const { bid, ask } = extractBidAsk(value);

  return {
    symbolId: `upstox:${instrumentKey}`,
    sequence,
    eventTime:
      typeof ltpc.ltt === "number" && ltpc.ltt > 0 ? ltpc.ltt : receivedAt,
    receivedAt,
    price: ltpc.ltp,
    size: typeof ltpc.ltq === "number" ? ltpc.ltq : 0,
    ...(typeof bid === "number" ? { bid } : {}),
    ...(typeof ask === "number" ? { ask } : {}),
    source: "upstox",
    quality: "live",
  };
}
