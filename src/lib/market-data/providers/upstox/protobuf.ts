import protobuf from "protobufjs";
import path from "node:path";

const PROTO_PATH = path.join(
  process.cwd(),
  "src/lib/market-data/providers/upstox/proto/MarketDataFeedV3.proto",
);

let rootPromise: Promise<protobuf.Root> | null = null;

async function getRoot() {
  if (!rootPromise) {
    rootPromise = protobuf.load(PROTO_PATH);
  }

  return rootPromise;
}

export async function decodeUpstoxV3Feed(buffer: Uint8Array) {
  const root = await getRoot();

  const FeedResponse = root.lookupType(
    "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse",
  );

  const message = FeedResponse.decode(buffer);

  return FeedResponse.toObject(message, {
    longs: Number,
    enums: String,
    defaults: false,
    arrays: true,
    objects: true,
  });
}
