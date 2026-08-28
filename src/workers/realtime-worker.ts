import http from "node:http";

import { startBackgroundAiLoop } from "@/workers/background-ai-loop";

import { WebSocket, WebSocketServer } from "ws";

import {
  getCoinDcxTicker,
  getCoinDcxTradeHistory,
} from "@/lib/brokers/coindcx-core";
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
const UPSTOX_RECONNECT_BASE_MS = 1_000;
const UPSTOX_RECONNECT_MAX_MS = 30_000;

function upstoxReconnectDelay(attempt: number) {
  const base = Math.min(
    UPSTOX_RECONNECT_MAX_MS,
    UPSTOX_RECONNECT_BASE_MS * 2 ** Math.min(5, attempt),
  );
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

const upstoxReconnectAttempts = new Map<string, number>();

const UPSTOX_ANALYTICS_TOKEN =
  process.env.UPSTOX_ANALYTICS_TOKEN?.trim() ?? "";

const COINDCX_SOCKET_STALE_MS = 8_000;
const COINDCX_FALLBACK_POLL_MS = 2_000;

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

type UpstoxFeedHandle = Awaited<ReturnType<typeof connectUpstoxV3MarketFeed>>;

type CoinDcxFeedHandle = ReturnType<typeof connectCoinDcxMarketSocket>;

const quotes = new Map<string, AnyQuote>();
const wss = new WebSocketServer({ noServer: true });

const upstoxHandles = new Set<UpstoxFeedHandle>();
let coinDcxPublicHandle: CoinDcxFeedHandle | null = null;
let coinDcxLastSocketTradeAt = 0;
let coinDcxFallbackBusy = false;
let coinDcxFallbackTimer: ReturnType<typeof setInterval> | null = null;

const upstoxDynamicRefs = new Map<string, number>();
const coinDcxDynamicRefs = new Map<string, number>();
const scannerUpstoxKeys = new Set<string>();
const scannerCoinDcxKeys = new Set<string>();

const BASE_UPSTOX_KEYS: Set<string> = new Set(UPSTOX_KEYS.map(String));
new Set(UPSTOX_KEYS);
const BASE_COINDCX_KEYS: Set<string> = new Set(COINDCX_KEYS.map(String));
new Set(COINDCX_KEYS);

let shuttingDown = false;

function refreshSubscribedCounts() {
  providers.upstox.subscribedInstruments = new Set([
    ...UPSTOX_KEYS,
    ...upstoxDynamicRefs.keys(),
    ...scannerUpstoxKeys,
  ]).size;

  providers.coindcx.subscribedInstruments = new Set([
    ...COINDCX_KEYS,
    ...coinDcxDynamicRefs.keys(),
    ...scannerCoinDcxKeys,
  ]).size;
}

function parseRuntimeInstrument(value: string) {
  const raw = value.trim();

  if (raw.toLowerCase().startsWith("upstox:")) {
    const key = raw.slice("upstox:".length);
    return key ? ({ provider: "upstox", key } as const) : null;
  }

  if (raw.toLowerCase().startsWith("coindcx:")) {
    const key = raw.slice("coindcx:".length);
    return key ? ({ provider: "coindcx", key } as const) : null;
  }

  return null;
}

function addRuntimeSubscription(value: string) {
  const parsed = parseRuntimeInstrument(value);
  if (!parsed) return false;

  if (parsed.provider === "upstox") {
    const previous = upstoxDynamicRefs.get(parsed.key) ?? 0;
    upstoxDynamicRefs.set(parsed.key, previous + 1);

    if (previous === 0 && !BASE_UPSTOX_KEYS.has(parsed.key)) {
      for (const handle of upstoxHandles) {
        handle.subscribe([parsed.key], "full");
      }
    }
  } else {
    const previous = coinDcxDynamicRefs.get(parsed.key) ?? 0;
    coinDcxDynamicRefs.set(parsed.key, previous + 1);

    if (previous === 0 && !BASE_COINDCX_KEYS.has(parsed.key)) {
      coinDcxPublicHandle?.subscribe([parsed.key]);
    }
  }

  refreshSubscribedCounts();
  return true;
}

function removeRuntimeSubscription(value: string) {
  const parsed = parseRuntimeInstrument(value);
  if (!parsed) return;

  const refs =
    parsed.provider === "upstox" ? upstoxDynamicRefs : coinDcxDynamicRefs;

  const previous = refs.get(parsed.key) ?? 0;

  if (previous <= 1) {
    refs.delete(parsed.key);

    if (parsed.provider === "upstox") {
      if (!BASE_UPSTOX_KEYS.has(parsed.key)) {
        for (const handle of upstoxHandles) {
          handle.unsubscribe([parsed.key], "full");
        }
      }
    } else if (!BASE_COINDCX_KEYS.has(parsed.key)) {
      coinDcxPublicHandle?.unsubscribe([parsed.key]);
    }
  } else {
    refs.set(parsed.key, previous - 1);
  }

  refreshSubscribedCounts();
}

function replaceScannerSubscriptions(values: string[]) {
  const wantedUpstox = new Set<string>();
  const wantedCoinDcx = new Set<string>();
  for (const value of values) {
    const parsed = parseRuntimeInstrument(value);
    if (!parsed) continue;
    if (parsed.provider === "upstox") wantedUpstox.add(parsed.key);
    else wantedCoinDcx.add(parsed.key);
  }
  for (const key of wantedUpstox) {
    if (scannerUpstoxKeys.has(key)) continue;
    scannerUpstoxKeys.add(key);
    if (!BASE_UPSTOX_KEYS.has(key) && !upstoxDynamicRefs.has(key)) for (const handle of upstoxHandles) handle.subscribe([key], "full");
  }
  for (const key of [...scannerUpstoxKeys]) {
    if (wantedUpstox.has(key)) continue;
    scannerUpstoxKeys.delete(key);
    if (!BASE_UPSTOX_KEYS.has(key) && !upstoxDynamicRefs.has(key)) for (const handle of upstoxHandles) handle.unsubscribe([key], "full");
  }
  for (const key of wantedCoinDcx) {
    if (scannerCoinDcxKeys.has(key)) continue;
    scannerCoinDcxKeys.add(key);
    if (!BASE_COINDCX_KEYS.has(key) && !coinDcxDynamicRefs.has(key)) coinDcxPublicHandle?.subscribe([key]);
  }
  for (const key of [...scannerCoinDcxKeys]) {
    if (wantedCoinDcx.has(key)) continue;
    scannerCoinDcxKeys.delete(key);
    if (!BASE_COINDCX_KEYS.has(key) && !coinDcxDynamicRefs.has(key)) coinDcxPublicHandle?.unsubscribe([key]);
  }
  refreshSubscribedCounts();
  return { upstox: scannerUpstoxKeys.size, coindcx: scannerCoinDcxKeys.size };
}

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
        : (providers.upstox.lastError ?? providers.coindcx.lastError),
    providers,
  };
}

function json(response: http.ServerResponse, status: number, payload: unknown) {
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
  connection: Awaited<
    ReturnType<typeof scanConnectedUpstoxWorkerConnections>
  >["connections"][number],
) {
  if (shuttingDown) return;
  let counted = false;

  let feedHandle: UpstoxFeedHandle | null = null;
  const reconnectKey = connection.connectionId || connection.ownerId || "market-data";

  try {
    feedHandle = await connectUpstoxV3MarketFeed({
      accessToken: connection.accessToken,
      instrumentKeys: [
        ...new Set([...UPSTOX_KEYS, ...upstoxDynamicRefs.keys(), ...scannerUpstoxKeys]),
      ],
      mode: "full",
      onOpen: () => {
        upstoxReconnectAttempts.set(reconnectKey, 0);
      },
      onMessage: (message) => {
        const response = message as { feeds?: Record<string, unknown> };
        for (const [instrumentKey, feed] of Object.entries(
          response.feeds ?? {},
        )) {
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
        if (feedHandle) {
          upstoxHandles.delete(feedHandle);
        }

        if (counted) {
          providers.upstox.activeSockets = Math.max(
            0,
            providers.upstox.activeSockets - 1,
          );
          counted = false;
        }
        if (!shuttingDown) {
          const attempt = upstoxReconnectAttempts.get(reconnectKey) ?? 0;
          upstoxReconnectAttempts.set(reconnectKey, attempt + 1);
          setTimeout(
            () => void runUpstoxConnection(connection),
            upstoxReconnectDelay(attempt),
          );
        }
      },
    });

    upstoxHandles.add(feedHandle);
    providers.upstox.activeSockets += 1;
    counted = true;
    refreshSubscribedCounts();
  } catch (error) {
    providers.upstox.lastError =
      error instanceof Error ? error.message : "Upstox connection failed";
    if (!shuttingDown) {
      const attempt = upstoxReconnectAttempts.get(reconnectKey) ?? 0;
          upstoxReconnectAttempts.set(reconnectKey, attempt + 1);
          setTimeout(
            () => void runUpstoxConnection(connection),
            upstoxReconnectDelay(attempt),
          );
    }
  }
}

async function startUpstox() {
  const scan = await scanConnectedUpstoxWorkerConnections();

  providers.upstox.accounts = scan.connections.length;
  providers.upstox.skippedConnections = scan.skipped;

  // Market data must not depend on the daily trading OAuth token.
  // Upstox Analytics Token is read-only, supports WebSocket market data,
  // and is valid for one year.
  if (UPSTOX_ANALYTICS_TOKEN) {
    await runUpstoxConnection({
      connectionId: "analytics-market-data",
      ownerId: "zerion-market-data",
      accessToken: UPSTOX_ANALYTICS_TOKEN,
    });

    return;
  }

  if (scan.connections.length === 0) {
    providers.upstox.lastError =
      "UPSTOX_ANALYTICS_TOKEN is not configured and no connected Upstox OAuth account was found";
    return;
  }

  // Shared chart market-data must not create a socket per trading user.
  // Prefer UPSTOX_ANALYTICS_TOKEN above; otherwise use one account only as
  // market-data fallback. User OAuth remains available for execution/P&L.
  const fallbackConnection = scan.connections[0];
  if (fallbackConnection) {
    await runUpstoxConnection(fallbackConnection);
  }
}

function normalizeCoinDcxPriceEvent(
  response: unknown,
): CoinDcxRealtimeQuote | null {
  const envelope = response as { data?: unknown };
  const row = (envelope?.data ?? response) as Record<string, unknown>;

  const rawPair = String(row.s ?? "").toUpperCase();
  const price = Number(row.p);
  const timestamp = Number(row.T ?? Date.now());

  if (!rawPair || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  const pair = rawPair.startsWith("B-")
    ? rawPair
    : `B-${rawPair.replace("USDT", "_USDT")}`;

  const previous = quoteFor(pair);

  return normalizeCoinDcxTrade(
    {
      data: {
        ...row,
        s: pair,
        p: price,
        T: timestamp,
      },
    },
    previous?.provider === "coindcx" ? previous : undefined,
  );
}

async function refreshCoinDcxFromLatestTrades() {
  for (const pair of new Set([
    ...COINDCX_KEYS,
    ...coinDcxDynamicRefs.keys(),
    ...scannerCoinDcxKeys,
  ])) {
    try {
      const rows = await getCoinDcxTradeHistory(pair, 5);

      const latest = [...rows]
        .filter((row) => Number.isFinite(Number(row.T)))
        .sort((a, b) => Number(b.T) - Number(a.T))[0];

      if (!latest) continue;

      const previous = quoteFor(pair);

      const quote = normalizeCoinDcxTrade(
        {
          data: {
            ...latest,
            s: pair,
          },
        },
        previous?.provider === "coindcx" ? previous : undefined,
      );

      if (quote) remember(quote);
    } catch (error) {
      providers.coindcx.lastError =
        error instanceof Error
          ? `CoinDCX latest trade fallback failed: ${error.message}`
          : "CoinDCX latest trade fallback failed";
    }
  }
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
      error instanceof Error
        ? error.message
        : "CoinDCX ticker bootstrap failed";
  }

  let publicCounted = false;
  coinDcxPublicHandle = connectCoinDcxMarketSocket({
    pairs: [...new Set([...COINDCX_KEYS, ...coinDcxDynamicRefs.keys(), ...scannerCoinDcxKeys])],
    onTrade: (response) => {
      const envelope = response as { data?: unknown };
      const row = (envelope?.data ?? response) as {
        s?: string;
      };

      const pair = String(row.s ?? "");
      const previous = quoteFor(pair);

      const quote = normalizeCoinDcxTrade(
        response,
        previous?.provider === "coindcx" ? previous : undefined,
      );

      if (quote) {
        remember(quote);
        coinDcxLastSocketTradeAt = Date.now();
      }
    },

    onPrice: (response) => {
      const quote = normalizeCoinDcxPriceEvent(response);

      if (quote) {
        remember(quote);
        coinDcxLastSocketTradeAt = Date.now();
      }
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

  if (!coinDcxFallbackTimer) {
    coinDcxFallbackTimer = setInterval(() => {
      void (async () => {
        if (shuttingDown || coinDcxFallbackBusy) return;

        const socketFresh =
          coinDcxLastSocketTradeAt > 0 &&
          Date.now() - coinDcxLastSocketTradeAt < COINDCX_SOCKET_STALE_MS;

        if (socketFresh) return;

        coinDcxFallbackBusy = true;

        try {
          await refreshCoinDcxFromLatestTrades();
        } catch (error) {
          providers.coindcx.lastError =
            error instanceof Error
              ? `CoinDCX latest trade fallback failed: ${error.message}`
              : "CoinDCX latest trade fallback failed";
        } finally {
          coinDcxFallbackBusy = false;
        }
      })();
    }, COINDCX_FALLBACK_POLL_MS);
  }

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

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {} as Record<string, unknown>;
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (url.pathname === "/" || url.pathname === "/health") {
    return json(response, 200, aggregateHealth());
  }

  if (url.pathname === "/subscriptions/scanner" && request.method === "POST") {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || request.headers.authorization !== `Bearer ${secret}`) return json(response, 401, { error: "unauthorized" });
    const body = await readJsonBody(request);
    const instruments = Array.isArray(body.instruments) ? body.instruments.filter((value): value is string => typeof value === "string") : [];
    const scanner = replaceScannerSubscriptions(instruments);
    return json(response, 200, { ok: true, scanner, health: aggregateHealth() });
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
  const clientSubscriptions = new Set<string>();

  client.send(
    JSON.stringify({
      type: "snapshot",
      data: [...quotes.values()],
      health: aggregateHealth(),
    }),
  );

  client.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as {
        type?: string;
        instruments?: unknown;
      };

      const instruments = Array.isArray(message.instruments)
        ? message.instruments
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

      if (message.type === "subscribe") {
        const accepted: string[] = [];

        for (const instrument of instruments) {
          if (clientSubscriptions.has(instrument)) continue;

          if (addRuntimeSubscription(instrument)) {
            clientSubscriptions.add(instrument);
            accepted.push(instrument);
          }
        }

        client.send(
          JSON.stringify({
            type: "subscribed",
            instruments: accepted,
            health: aggregateHealth(),
          }),
        );

        return;
      }

      if (message.type === "unsubscribe") {
        for (const instrument of instruments) {
          if (!clientSubscriptions.delete(instrument)) continue;
          removeRuntimeSubscription(instrument);
        }

        client.send(
          JSON.stringify({
            type: "unsubscribed",
            instruments,
            health: aggregateHealth(),
          }),
        );
      }
    } catch {
      client.send(
        JSON.stringify({
          type: "error",
          error: "invalid_realtime_message",
        }),
      );
    }
  });

  client.on("close", () => {
    for (const instrument of clientSubscriptions) {
      removeRuntimeSubscription(instrument);
    }

    clientSubscriptions.clear();
  });
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

  if (coinDcxFallbackTimer) {
    clearInterval(coinDcxFallbackTimer);
    coinDcxFallbackTimer = null;
  }

  coinDcxPublicHandle?.close();

  for (const client of wss.clients) client.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
