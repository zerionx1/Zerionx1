import { createHmac } from "node:crypto";

import type { CoinDcxCredentials } from "@/lib/brokers/coindcx-core";

export type SocketLike = {
  on(event: string, callback: (...args: unknown[]) => void): SocketLike;
  emit(event: string, payload?: unknown): SocketLike;
  close(): void;
};

export type CoinDcxMarketSocketHandle = {
  socket: SocketLike;
  subscribe(pairs: string[]): void;
  unsubscribe(pairs: string[]): void;
  close(): void;
};

type IoFactory = (
  endpoint: string,
  options: {
    transports: string[];
    reconnection: boolean;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
  },
) => SocketLike;

// CoinDCX documentation requires Socket.IO transport rather than a raw WebSocket.
import socketIoClient from "socket.io-client";

const io = socketIoClient as unknown as IoFactory;
const ENDPOINT = "https://stream.coindcx.com";

function makeSocket() {
  return io(ENDPOINT, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  });
}

export function connectCoinDcxMarketSocket(options: {
  pairs: string[];
  onTrade: (response: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}): CoinDcxMarketSocketHandle {
  const socket = makeSocket();
  const joinedPairs = new Set<string>(options.pairs);

  socket.on("connect", () => {
    for (const pair of joinedPairs) {
      socket.emit("join", { channelName: `${pair}@trades` });
    }
    options.onOpen?.();
  });

  socket.on("new-trade", (...args) => {
    options.onTrade(args[0]);
  });

  socket.on("disconnect", () => options.onClose?.());
  socket.on("connect_error", (...args) => {
    const value = args[0];
    options.onError?.(
      value instanceof Error
        ? value
        : new Error("CoinDCX socket connection failed"),
    );
  });

  return {
    socket,

    subscribe(pairs: string[]) {
      for (const pair of pairs.filter(Boolean)) {
        if (joinedPairs.has(pair)) continue;

        joinedPairs.add(pair);
        socket.emit("join", {
          channelName: `${pair}@trades`,
        });
      }
    },

    unsubscribe(pairs: string[]) {
      for (const pair of pairs.filter(Boolean)) {
        if (!joinedPairs.has(pair)) continue;

        joinedPairs.delete(pair);
        socket.emit("leave", {
          channelName: `${pair}@trades`,
        });
      }
    },

    close() {
      for (const pair of joinedPairs) {
        socket.emit("leave", { channelName: `${pair}@trades` });
      }

      joinedPairs.clear();
      socket.close();
    },
  };
}

export function connectCoinDcxPrivateSocket(options: {
  credentials: CoinDcxCredentials;
  onBalance?: (response: unknown) => void;
  onOrder?: (response: unknown) => void;
  onTrade?: (response: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}) {
  const socket = makeSocket();
  const body = { channel: "coindcx" };
  const signature = createHmac("sha256", options.credentials.apiSecret)
    .update(JSON.stringify(body))
    .digest("hex");

  socket.on("connect", () => {
    socket.emit("join", {
      channelName: "coindcx",
      authSignature: signature,
      apiKey: options.credentials.apiKey,
    });
    options.onOpen?.();
  });

  socket.on("balance-update", (...args) => options.onBalance?.(args[0]));
  socket.on("order-update", (...args) => options.onOrder?.(args[0]));
  socket.on("trade-update", (...args) => options.onTrade?.(args[0]));
  socket.on("disconnect", () => options.onClose?.());
  socket.on("connect_error", (...args) => {
    const value = args[0];
    options.onError?.(
      value instanceof Error
        ? value
        : new Error("CoinDCX private socket connection failed"),
    );
  });

  return {
    socket,
    close() {
      socket.emit("leave", { channelName: "coindcx" });
      socket.close();
    },
  };
}
