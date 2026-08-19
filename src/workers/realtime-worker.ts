import http from "node:http";

import { listConnectedUpstoxWorkerConnections } from "@/lib/brokers/upstox-worker-store";
import { connectUpstoxV3MarketFeed } from "@/lib/market-data/providers/upstox/socket";
import { mapUpstoxV3FeedToTick } from "@/lib/market-data/providers/upstox/tick-mapper";

const PORT = Number(process.env.PORT ?? 10000);

const INSTRUMENT_KEYS = ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank"];

type WorkerHealth = {
  startedAt: string;
  accounts: number;
  activeSockets: number;
  lastTickAt: string | null;
  lastError: string | null;
};

const health: WorkerHealth = {
  startedAt: new Date().toISOString(),
  accounts: 0,
  activeSockets: 0,
  lastTickAt: null,
  lastError: null,
};

let sequence = 0;

async function startUpstoxSockets() {
  const connections = await listConnectedUpstoxWorkerConnections();

  health.accounts = connections.length;

  if (connections.length === 0) {
    throw new Error("No connected Upstox accounts found");
  }

  for (const connection of connections) {
    await connectUpstoxV3MarketFeed({
      accessToken: connection.accessToken,
      instrumentKeys: INSTRUMENT_KEYS,
      mode: "full",
      onMessage: (message) => {
        const response = message as {
          feeds?: Record<string, unknown>;
        };

        for (const [instrumentKey, feed] of Object.entries(
          response.feeds ?? {},
        )) {
          try {
            const tick = mapUpstoxV3FeedToTick(instrumentKey, feed, ++sequence);

            health.lastTickAt = new Date(tick.receivedAt).toISOString();
            health.lastError = null;

            console.log(
              JSON.stringify({
                type: "upstox_tick",
                ownerId: connection.ownerId,
                symbolId: tick.symbolId,
                price: tick.price,
                bid: tick.bid,
                ask: tick.ask,
                eventTime: tick.eventTime,
              }),
            );
          } catch (error) {
            health.lastError =
              error instanceof Error ? error.message : "Tick mapping failed";
          }
        }
      },
      onError: (error) => {
        health.lastError = error.message;
        console.error("Upstox socket error:", error.message);
      },
      onClose: () => {
        health.activeSockets = Math.max(0, health.activeSockets - 1);
        console.warn("Upstox socket closed");
      },
    });

    health.activeSockets += 1;
  }
}

const server = http.createServer((request, response) => {
  if (request.url === "/health" || request.url === "/") {
    response.writeHead(200, {
      "content-type": "application/json",
    });

    response.end(
      JSON.stringify({
        ok: health.activeSockets > 0,
        ...health,
      }),
    );

    return;
  }

  response.writeHead(404, {
    "content-type": "application/json",
  });

  response.end(
    JSON.stringify({
      error: "Not found",
    }),
  );
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Zerion realtime worker listening on port ${PORT}`);
});

startUpstoxSockets().catch((error) => {
  health.lastError =
    error instanceof Error ? error.message : "Worker startup failed";

  console.error("Realtime worker startup failed:", health.lastError);
});
