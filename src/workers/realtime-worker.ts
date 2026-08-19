import http from "node:http";

import { WebSocket, WebSocketServer } from "ws";

import { scanConnectedUpstoxWorkerConnections } from "@/lib/brokers/upstox-worker-store";
import {
  UPSTOX_INSTRUMENTS,
  normalizeUpstoxFeedQuote,
  type ZerionRealtimeQuote,
} from "@/lib/market-data/providers/upstox/feed-normalizer";
import { connectUpstoxV3MarketFeed } from "@/lib/market-data/providers/upstox/socket";

const PORT = Number(process.env.PORT ?? 10000);
const INSTRUMENT_KEYS = Object.values(UPSTOX_INSTRUMENTS);
const RECONNECT_MS = 5_000;

type WorkerHealth = {
  startedAt: string;
  accounts: number;
  skippedConnections: number;
  activeSockets: number;
  subscribedInstruments: number;
  lastTickAt: string | null;
  lastError: string | null;
};

const health: WorkerHealth = {
  startedAt: new Date().toISOString(),
  accounts: 0,
  skippedConnections: 0,
  activeSockets: 0,
  subscribedInstruments: INSTRUMENT_KEYS.length,
  lastTickAt: null,
  lastError: null,
};

const quotes = new Map<string, ZerionRealtimeQuote>();
const wss = new WebSocketServer({ noServer: true });
let shuttingDown = false;

function publicHealth() {
  return {
    ok: health.activeSockets > 0 && Boolean(health.lastTickAt),
    ...health,
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

function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

async function runConnection(
  connection: Awaited<ReturnType<typeof scanConnectedUpstoxWorkerConnections>>["connections"][number],
) {
  if (shuttingDown) return;

  let counted = false;

  try {
    await connectUpstoxV3MarketFeed({
      accessToken: connection.accessToken,
      instrumentKeys: INSTRUMENT_KEYS,
      mode: "full",
      onMessage: (message) => {
        const response = message as { feeds?: Record<string, unknown> };

        for (const [instrumentKey, feed] of Object.entries(response.feeds ?? {})) {
          try {
            const quote = normalizeUpstoxFeedQuote(instrumentKey, feed);
            quotes.set(instrumentKey, quote);
            health.lastTickAt = quote.timestamp;
            health.lastError = null;

            broadcast({
              type: "quote",
              data: quote,
            });

            console.log(
              JSON.stringify({
                type: "upstox_tick",
                symbol: quote.symbol,
                price: quote.price,
                timestamp: quote.timestamp,
              }),
            );
          } catch {
            // Market-info/snapshot frames that do not contain LTPC are valid.
          }
        }
      },
      onError: (error) => {
        health.lastError = error.message;
        console.error("Upstox socket error:", error.message);
      },
      onClose: () => {
        if (counted) {
          health.activeSockets = Math.max(0, health.activeSockets - 1);
          counted = false;
        }
        if (!shuttingDown) {
          setTimeout(() => void runConnection(connection), RECONNECT_MS);
        }
      },
    });

    health.activeSockets += 1;
    counted = true;
  } catch (error) {
    health.lastError =
      error instanceof Error ? error.message : "Upstox worker connection failed";
    console.error("Upstox worker connection failed:", health.lastError);

    if (!shuttingDown) {
      setTimeout(() => void runConnection(connection), RECONNECT_MS);
    }
  }
}

async function startUpstoxSockets() {
  const scan = await scanConnectedUpstoxWorkerConnections();
  health.accounts = scan.connections.length;
  health.skippedConnections = scan.skipped;

  if (scan.connections.length === 0) {
    health.lastError =
      scan.skipped > 0
        ? "No decryptable connected Upstox account found"
        : "No connected Upstox accounts found";
    return;
  }

  await Promise.all(scan.connections.map((connection) => runConnection(connection)));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/" || url.pathname === "/health") {
    return json(response, 200, publicHealth());
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
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
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
      health: publicHealth(),
    }),
  );
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Zerion realtime worker listening on port ${PORT}`);
});

void startUpstoxSockets().catch((error) => {
  health.lastError =
    error instanceof Error ? error.message : "Worker startup failed";
  console.error("Realtime worker startup failed:", health.lastError);
});

function shutdown() {
  shuttingDown = true;
  for (const client of wss.clients) client.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
