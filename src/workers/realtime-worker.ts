import http from "node:http";

import { startBackgroundAiLoop } from "@/workers/background-ai-loop";

import { WebSocket, WebSocketServer } from "ws";

import { getCoinDcxTicker } from "@/lib/brokers/coindcx-core";
import { scanConnectedCoinDcxWorkerConnections } from "@/lib/brokers/coindcx-worker-store";
import { scanConnectedUpstoxWorkerConnections } from "@/lib/brokers/upstox-worker-store";
import {
  COINDCX_PAIRS,
  normalizeCoinDcxTicker,
  normalizeCoinDcxTrade,
  type CoinDcxRealtimeQuote,
} from "@/lib/market-data/providers/coindcx/feed-normalizer";
import {
  connectCoinDcxMarketSocket,
  connectCoinDcxPrivateSocket,
} from "@/lib/market-data/providers/coindcx/socket";
import {
  UPSTOX_INSTRUMENTS,
  normalizeUpstoxFeedQuote,
  type ZerionRealtimeQuote,
} from "@/lib/market-data/providers/upstox/feed-normalizer";
import { connectUpstoxV3MarketFeed } from "@/lib/market-data/providers/upstox/socket";

const PORT = Number(process.env.PORT ?? 10000);
const UPSTOX_KEYS = Object.values(UPSTOX_INSTRUMENTS);
const COINDCX_KEYS = Object.values(COINDCX_PAIRS);
const RECONNECT_MS = 5_000;

type ProviderHealth = {
  accounts: number;
  activeSockets: number;
  skippedConnections: number;
  subscribedInstruments: number;
  lastTickAt: string | null;
  lastError: string | null;
};

const startedAt = new Date().toISOString();
const providers: Record<"upstox" | "coindcx", ProviderHealth> = {
  upstox: {
    accounts: 0,
    activeSockets: 0,
    skippedConnections: 0,
    subscribedInstruments: UPSTOX_KEYS.length,
    lastTickAt: null,
    lastError: null,
  },
  coindcx: {
    accounts: 0,
    activeSockets: 0,
    skippedConnections: 0,
    subscribedInstruments: COINDCX_KEYS.length,
    lastTickAt: null,
    lastError: null,
  },
};

type AnyQuote = ZerionRealtimeQuote | CoinDcxRealtimeQuote;
const quotes = new Map<string, AnyQuote>();
const wss = new WebSocketServer({ noServer: true });
let shuttingDown = false;

function aggregateHealth() {
  const activeSockets =
    providers.upstox.activeSockets + providers.coindcx.activeSockets;
  const lastTimes = [
    providers.upstox.lastTickAt,
    providers.coindcx.lastTickAt,
  ].filter((value): value is string => Boolean(value));

  return {
    ok: activeSockets > 0 && lastTimes.length > 0,
    startedAt,
    accounts: providers.upstox.accounts + providers.coindcx.accounts,
    activeSockets,
    subscribedInstruments:
      providers.upstox.subscribedInstruments +
      providers.coindcx.subscribedInstruments,
    lastTickAt: lastTimes.sort().at(-1) ?? null,
    lastError:
      activeSockets > 0
        ? null
        : providers.upstox.lastError ?? providers.coindcx.lastError,
    providers,
  };
}

function json(
  response: http.ServerResponse,
  status: number,
  payload: unknown,
) {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(payload));
}

function quoteFor(input: string) {
  const value = input.trim().toUpperCase();
  for (const quote of quotes.values()) {
    if (
      quote.symbol.toUpperCase() === value ||
      quote.providerSymbol.toUpperCase() === value ||
      quote.instrumentId.toUpperCase() === value
    ) {
      return quote;
    }
  }
  return undefined;
}

function remember(quote: AnyQuote) {
  quotes.set(quote.instrumentId, quote);
  providers[quote.provider].lastTickAt = quote.timestamp;
  providers[quote.provider].lastError = null;
  broadcast({ type: "quote", data: quote });
}

function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

async function runUpstoxConnection(
  connection: Awaited<ReturnType<typeof scanConnectedUpstoxWorkerConnections>>["connections"][number],
) {
  if (shuttingDown) return;
  let counted = false;

  try {
    await connectUpstoxV3MarketFeed({
      accessToken: connection.accessToken,
      instrumentKeys: UPSTOX_KEYS,
      mode: "full",
      onMessage: (message) => {
        const response = message as { feeds?: Record<string, unknown> };
        for (const [instrumentKey, feed] of Object.entries(response.feeds ?? {})) {
          try {
            const quote = normalizeUpstoxFeedQuote(instrumentKey, feed);
            remember(quote);
          } catch {
            // Snapshot frames without LTPC are valid.
          }
        }
      },
      onError: (error) => {
        providers.upstox.lastError = error.message;
      },
      onClose: () => {
        if (counted) {
          providers.upstox.activeSockets = Math.max(
            0,
            providers.upstox.activeSockets - 1,
          );
          counted = false;
        }
        if (!shuttingDown) {
          setTimeout(() => void runUpstoxConnection(connection), RECONNECT_MS);
        }
      },
    });

    providers.upstox.activeSockets += 1;
    counted = true;
  } catch (error) {
    providers.upstox.lastError =
      error instanceof Error ? error.message : "Upstox connection failed";
    if (!shuttingDown) {
      setTimeout(() => void runUpstoxConnection(connection), RECONNECT_MS);
    }
  }
}

async function startUpstox() {
  const scan = await scanConnectedUpstoxWorkerConnections();
  providers.upstox.accounts = scan.connections.length;
  providers.upstox.skippedConnections = scan.skipped;

  if (scan.connections.length === 0) {
    providers.upstox.lastError = "No connected Upstox account found";
    return;
  }

  await Promise.all(
    scan.connections.map((connection) => runUpstoxConnection(connection)),
  );
}

async function startCoinDcx() {
  try {
    const ticker = await getCoinDcxTicker();
    for (const row of ticker) {
      const quote = normalizeCoinDcxTicker(row);
      if (quote) remember(quote);
    }
  } catch (error) {
    providers.coindcx.lastError =
      error instanceof Error ? error.message : "CoinDCX ticker bootstrap failed";
  }

  let publicCounted = false;
  connectCoinDcxMarketSocket({
    pairs: COINDCX_KEYS,
    onTrade: (response) => {
      const row = response as { data?: { s?: string } };
      const pair = String(row.data?.s ?? "");
      const previous = quoteFor(pair);
      const quote = normalizeCoinDcxTrade(
        response,
        previous?.provider === "coindcx" ? previous : undefined,
      );
      if (quote) remember(quote);
    },
    onOpen: () => {
      if (!publicCounted) {
        providers.coindcx.activeSockets += 1;
        publicCounted = true;
      }
    },
    onClose: () => {
      if (publicCounted) {
        providers.coindcx.activeSockets = Math.max(
          0,
          providers.coindcx.activeSockets - 1,
        );
        publicCounted = false;
      }
    },
    onError: (error) => {
      providers.coindcx.lastError = error.message;
    },
  });

  const scan = await scanConnectedCoinDcxWorkerConnections();
  providers.coindcx.accounts = scan.connections.length;
  providers.coindcx.skippedConnections = scan.skipped;

  for (const connection of scan.connections) {
    let counted = false;
    connectCoinDcxPrivateSocket({
      credentials: connection.credentials,
      onOpen: () => {
        if (!counted) {
          providers.coindcx.activeSockets += 1;
          counted = true;
        }
      },
      onClose: () => {
        if (counted) {
          providers.coindcx.activeSockets = Math.max(
            0,
            providers.coindcx.activeSockets - 1,
          );
          counted = false;
        }
      },
      onError: (error) => {
        providers.coindcx.lastError = error.message;
      },
      onBalance: () => {
        // The authenticated socket remains active; REST account endpoint
        // retrieves the authoritative wallet snapshot on demand.
      },
      onOrder: () => {},
      onTrade: () => {},
    });
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (url.pathname === "/" || url.pathname === "/health") {
    return json(response, 200, aggregateHealth());
  }

  if (url.pathname === "/quote") {
    const symbol = url.searchParams.get("symbol") ?? "";
    const quote = quoteFor(symbol);
    return quote
      ? json(response, 200, quote)
      : json(response, 404, { error: "quote_not_available", symbol });
  }

  if (url.pathname === "/quotes") {
    const requested = (url.searchParams.get("symbols") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const data = requested.length
      ? requested.map(quoteFor).filter(Boolean)
      : [...quotes.values()];

    return json(response, 200, { data });
  }

  return json(response, 404, { error: "Not found" });
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  if (url.pathname !== "/realtime") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (client) => {
    wss.emit("connection", client, request);
  });
});

wss.on("connection", (client) => {
  client.send(
    JSON.stringify({
      type: "snapshot",
      data: [...quotes.values()],
      health: aggregateHealth(),
    }),
  );
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Zerion realtime worker listening on port ${PORT}`);
});

startBackgroundAiLoop();

void Promise.all([startUpstox(), startCoinDcx()]).catch((error) => {
  console.error(
    "Realtime worker startup failed:",
    error instanceof Error ? error.message : error,
  );
});

function shutdown() {
  shuttingDown = true;
  for (const client of wss.clients) client.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
