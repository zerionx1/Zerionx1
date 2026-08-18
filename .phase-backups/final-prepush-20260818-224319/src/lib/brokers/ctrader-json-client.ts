import "server-only";

import { getConnectedBrokerConnection } from "@/lib/brokers/connection-store";

const PAYLOAD = {
  APPLICATION_AUTH_REQ: 2100,
  APPLICATION_AUTH_RES: 2101,
  ACCOUNT_AUTH_REQ: 2102,
  ACCOUNT_AUTH_RES: 2103,
  NEW_ORDER_REQ: 2106,
  SYMBOLS_LIST_REQ: 2114,
  SYMBOLS_LIST_RES: 2115,
  TRADER_REQ: 2121,
  TRADER_RES: 2122,
  RECONCILE_REQ: 2124,
  RECONCILE_RES: 2125,
  EXECUTION_EVENT: 2126,
  GET_ACCOUNTS_REQ: 2149,
  GET_ACCOUNTS_RES: 2150,
  ERROR_RES: 2142,
} as const;

type CTraderMessage = {
  clientMsgId?: string;
  payloadType: number;
  payload?: Record<string, unknown>;
};

function accessTokenFrom(payload: Record<string, unknown>) {
  const value = payload.accessToken ?? payload.access_token;
  if (typeof value !== "string" || !value) {
    throw new Error("cTrader access token is missing");
  }
  return value;
}

function appConfig() {
  const clientId = process.env.CTRADER_CLIENT_ID;
  const clientSecret = process.env.CTRADER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("cTrader application credentials are missing");
  }

  return { clientId, clientSecret };
}

function waitForMessage(
  ws: WebSocket,
  match: (message: CTraderMessage) => boolean,
  timeoutMs = 12000,
) {
  return new Promise<CTraderMessage>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("cTrader request timed out"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("error", onError);
    }

    function onError() {
      cleanup();
      reject(new Error("cTrader WebSocket error"));
    }

    function onMessage(event: MessageEvent) {
      try {
        const message = JSON.parse(String(event.data)) as CTraderMessage;
        if (message.payloadType === PAYLOAD.ERROR_RES) {
          cleanup();
          reject(
            new Error(
              String(message.payload?.description ?? message.payload?.errorCode ?? "cTrader error"),
            ),
          );
          return;
        }

        if (match(message)) {
          cleanup();
          resolve(message);
        }
      } catch {
        // Ignore non-JSON messages.
      }
    }

    ws.addEventListener("message", onMessage);
    ws.addEventListener("error", onError);
  });
}

function send(ws: WebSocket, payloadType: number, payload: Record<string, unknown>) {
  const clientMsgId = crypto.randomUUID();
  ws.send(JSON.stringify({ clientMsgId, payloadType, payload }));
  return clientMsgId;
}

async function openSocket(isLive: boolean) {
  const url = isLive
    ? "wss://live.ctraderapi.com:5036"
    : "wss://demo.ctraderapi.com:5036";

  const ws = new WebSocket(url);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("cTrader connection timed out")), 10000);
    ws.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    ws.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("Could not connect to cTrader"));
      },
      { once: true },
    );
  });

  return ws;
}

async function authorizeApplication(ws: WebSocket) {
  const cfg = appConfig();
  const id = send(ws, PAYLOAD.APPLICATION_AUTH_REQ, cfg);
  await waitForMessage(
    ws,
    (message) =>
      message.clientMsgId === id || message.payloadType === PAYLOAD.APPLICATION_AUTH_RES,
  );
}

async function accountListForToken(accessToken: string, isLive: boolean) {
  const ws = await openSocket(isLive);
  try {
    await authorizeApplication(ws);
    const id = send(ws, PAYLOAD.GET_ACCOUNTS_REQ, { accessToken });
    const response = await waitForMessage(
      ws,
      (message) => message.clientMsgId === id || message.payloadType === PAYLOAD.GET_ACCOUNTS_RES,
    );
    return (response.payload?.ctidTraderAccount ?? []) as Array<Record<string, unknown>>;
  } finally {
    ws.close();
  }
}

async function withAuthorizedAccount<T>(
  accountId: string,
  isLive: boolean,
  operation: (ws: WebSocket, accountId: string) => Promise<T>,
) {
  const { token } = await getConnectedBrokerConnection("ctrader");
  const accessToken = accessTokenFrom(token);
  const ws = await openSocket(isLive);

  try {
    await authorizeApplication(ws);

    const authId = send(ws, PAYLOAD.ACCOUNT_AUTH_REQ, {
      ctidTraderAccountId: accountId,
      accessToken,
    });

    await waitForMessage(
      ws,
      (message) =>
        message.clientMsgId === authId || message.payloadType === PAYLOAD.ACCOUNT_AUTH_RES,
    );

    return await operation(ws, accountId);
  } finally {
    ws.close();
  }
}

export async function listCTraderAccounts() {
  const { token } = await getConnectedBrokerConnection("ctrader");
  const accessToken = accessTokenFrom(token);

  const [live, demo] = await Promise.allSettled([
    accountListForToken(accessToken, true),
    accountListForToken(accessToken, false),
  ]);

  const rows = [
    ...(live.status === "fulfilled" ? live.value : []),
    ...(demo.status === "fulfilled" ? demo.value : []),
  ];

  const unique = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    unique.set(String(row.ctidTraderAccountId), row);
  }

  return [...unique.values()];
}

export async function getCTraderAccountState(accountId: string, isLive: boolean) {
  return withAuthorizedAccount(accountId, isLive, async (ws, id) => {
    const traderId = send(ws, PAYLOAD.TRADER_REQ, { ctidTraderAccountId: id });
    const trader = await waitForMessage(
      ws,
      (message) => message.clientMsgId === traderId || message.payloadType === PAYLOAD.TRADER_RES,
    );

    const reconcileId = send(ws, PAYLOAD.RECONCILE_REQ, {
      ctidTraderAccountId: id,
      returnProtectionOrders: true,
    });
    const reconcile = await waitForMessage(
      ws,
      (message) =>
        message.clientMsgId === reconcileId || message.payloadType === PAYLOAD.RECONCILE_RES,
    );

    return {
      trader: trader.payload ?? {},
      positions: reconcile.payload?.position ?? [],
      pendingOrders: reconcile.payload?.order ?? [],
    };
  });
}

export async function placeCTraderOrder(input: {
  accountId: string;
  isLive: boolean;
  symbolId: string;
  side: "BUY" | "SELL";
  volume: number;
  orderType?: "MARKET" | "LIMIT" | "STOP";
  limitPrice?: number;
  stopPrice?: number;
  label?: string;
  comment?: string;
}) {
  return withAuthorizedAccount(input.accountId, input.isLive, async (ws, id) => {
    const orderType =
      input.orderType === "LIMIT" ? 2 : input.orderType === "STOP" ? 3 : 1;
    const tradeSide = input.side === "SELL" ? 2 : 1;

    const requestId = send(ws, PAYLOAD.NEW_ORDER_REQ, {
      ctidTraderAccountId: id,
      symbolId: input.symbolId,
      orderType,
      tradeSide,
      volume: Math.round(input.volume * 100),
      limitPrice: input.limitPrice,
      stopPrice: input.stopPrice,
      label: input.label ?? "Zerion X1",
      comment: input.comment ?? "User-approved Zerion X1 order",
    });

    const response = await waitForMessage(
      ws,
      (message) =>
        message.clientMsgId === requestId || message.payloadType === PAYLOAD.EXECUTION_EVENT,
      15000,
    );

    return response.payload ?? {};
  });
}
