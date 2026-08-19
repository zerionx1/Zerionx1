import type {
  FeedHealth,
  MarketCandle,
  MarketSymbol,
  MarketTick,
  Timeframe,
} from "@/types/market-data";

import type {
  MarketDataProvider,
  ProviderCredentials,
} from "../../core/provider";
import type { UpstoxProviderConfig } from "./config";
import { UpstoxHttpClient } from "./client";
import type { UpstoxMapper } from "./mapper";
import { connectUpstoxV3MarketFeed } from "./socket";
import { mapUpstoxV3FeedToTick } from "./tick-mapper";

type UpstoxFeedResponse = {
  feeds?: Record<string, unknown>;
};

export class UpstoxMarketDataProvider implements MarketDataProvider {
  readonly id = "upstox";
  readonly displayName = "Upstox";

  private state: FeedHealth = {
    provider: this.id,
    state: "idle",
    reconnects: 0,
    droppedEvents: 0,
    invalidEvents: 0,
  };

  private client: UpstoxHttpClient;
  private sequence = 0;

  constructor(
    readonly config: UpstoxProviderConfig,
    private mapper: UpstoxMapper,
  ) {
    this.client = new UpstoxHttpClient(config);
  }

  get enabled() {
    return this.config.enabled;
  }

  async connect(_credentials?: ProviderCredentials) {
    if (!this.enabled) {
      throw new Error("upstox provider disabled");
    }

    this.state = {
      ...this.state,
      state: "connected",
    };
  }

  async disconnect() {
    this.state = {
      ...this.state,
      state: "disconnected",
    };
  }

  health() {
    return { ...this.state };
  }

  async symbols(): Promise<MarketSymbol[]> {
    const rows = await this.client.request<unknown[]>("/symbols");
    return rows.map(this.mapper.symbol);
  }

  async historical(
    symbol: string,
    timeframe: Timeframe,
    from: number,
    to: number,
  ): Promise<MarketCandle[]> {
    const rows = await this.client.request<unknown[]>(
      `/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&from=${from}&to=${to}`,
    );

    return rows.map((row) => this.mapper.candle(row, timeframe));
  }

  async subscribe(
    symbols: string[],
    onTick: (tick: MarketTick) => void,
  ): Promise<() => Promise<void>> {
    const connection = await connectUpstoxV3MarketFeed({
      instrumentKeys: symbols,
      mode: "full",
      onMessage: (message) => {
        const response = message as UpstoxFeedResponse;

        for (const [instrumentKey, feed] of Object.entries(
          response.feeds ?? {},
        )) {
          try {
            const tick = mapUpstoxV3FeedToTick(
              instrumentKey,
              feed,
              ++this.sequence,
            );

            this.state = {
              ...this.state,
              state: "connected",
              lastEventAt: tick.receivedAt,
              lagMs: Math.max(0, tick.receivedAt - tick.eventTime),
            };

            onTick(tick);
          } catch {
            this.state = {
              ...this.state,
              invalidEvents: this.state.invalidEvents + 1,
            };
          }
        }
      },
      onError: (error) => {
        this.state = {
          ...this.state,
          state: "degraded",
          message: error.message,
        };
      },
      onClose: () => {
        this.state = {
          ...this.state,
          state: "disconnected",
        };
      },
    });

    return connection.close;
  }
}
