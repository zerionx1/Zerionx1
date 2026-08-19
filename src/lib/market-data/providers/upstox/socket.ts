import { randomUUID } from "node:crypto";

import WebSocket from "ws";

import { getUpstoxMarketDataFeedV3AuthorizeUrlForAccessToken } from "@/lib/brokers/upstox-feed-auth-core";

import { decodeUpstoxV3Feed } from "./protobuf";

export type UpstoxV3Mode = "ltpc" | "option_greeks" | "full" | "full_d30";

export interface UpstoxV3SocketOptions {
  instrumentKeys: string[];
  mode?: UpstoxV3Mode;
  accessToken?: string;
  onMessage: (message: unknown) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

function subscriptionPayload(
  instrumentKeys: string[],
  mode: UpstoxV3Mode,
): Buffer {
  return Buffer.from(
    JSON.stringify({
      guid: randomUUID(),
      method: "sub",
      data: {
        mode,
        instrumentKeys,
      },
    }),
    "utf8",
  );
}

export async function connectUpstoxV3MarketFeed(
  options: UpstoxV3SocketOptions,
) {
  if (options.instrumentKeys.length === 0) {
    throw new Error("At least one Upstox instrument key is required");
  }

  if (!options.accessToken) {
    throw new Error("Upstox worker access token is required");
  }

  const authorizedUrl =
    await getUpstoxMarketDataFeedV3AuthorizeUrlForAccessToken(
      options.accessToken,
    );

  const socket = new WebSocket(authorizedUrl, {
    followRedirects: true,
  });

  socket.binaryType = "arraybuffer";

  socket.on("open", () => {
    socket.send(
      subscriptionPayload(options.instrumentKeys, options.mode ?? "ltpc"),
      { binary: true },
    );
  });

  socket.on("message", async (data) => {
    try {
      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : Array.isArray(data)
            ? new Uint8Array(Buffer.concat(data))
            : ArrayBuffer.isView(data)
              ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
              : new Uint8Array(data);

      const decoded = await decodeUpstoxV3Feed(bytes);
      options.onMessage(decoded);
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error("Upstox feed decode failed"),
      );
    }
  });

  socket.on("error", (error) => {
    options.onError?.(
      error instanceof Error ? error : new Error("Upstox WebSocket error"),
    );
  });

  socket.on("close", () => {
    options.onClose?.();
  });

  return {
    socket,
    close: async () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    },
  };
}
