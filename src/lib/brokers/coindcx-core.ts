import { createHmac } from "node:crypto";

export type CoinDcxCredentials = {
  apiKey: string;
  apiSecret: string;
};

export type CoinDcxBalance = {
  currency: string;
  balance: number;
  locked_balance: number;
};

export type CoinDcxMarketDetail = {
  coindcx_name?: string;
  base_currency_short_name?: string;
  target_currency_short_name?: string;
  symbol?: string;
  pair?: string;
  status?: string;
};

const API = "https://api.coindcx.com";
const PUBLIC = "https://public.coindcx.com";

function signature(secret: string, body: unknown) {
  return createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");
}

async function jsonOrThrow(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `CoinDCX request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export function coinDcxServerCredentials(): CoinDcxCredentials | null {
  const apiKey = process.env.COINDCX_API_KEY;
  const apiSecret = process.env.COINDCX_API_SECRET;
  return apiKey && apiSecret ? { apiKey, apiSecret } : null;
}

export async function coinDcxAuthRequest<T>(
  credentials: CoinDcxCredentials,
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const payload = { ...body, timestamp: Date.now() };
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-AUTH-APIKEY": credentials.apiKey,
      "X-AUTH-SIGNATURE": signature(credentials.apiSecret, payload),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return (await jsonOrThrow(response)) as T;
}

export async function verifyCoinDcxCredentials(
  credentials: CoinDcxCredentials,
) {
  return coinDcxAuthRequest<unknown[]>(
    credentials,
    "/exchange/v1/users/info",
  );
}

export async function getCoinDcxBalances(
  credentials: CoinDcxCredentials,
) {
  return coinDcxAuthRequest<CoinDcxBalance[]>(
    credentials,
    "/exchange/v1/users/balances",
  );
}

export async function getCoinDcxTicker() {
  const response = await fetch(`${API}/exchange/ticker`, {
    cache: "no-store",
  });
  return (await jsonOrThrow(response)) as Array<Record<string, unknown>>;
}

export async function getCoinDcxMarketDetails() {
  const response = await fetch(`${API}/exchange/v1/markets_details`, {
    cache: "no-store",
  });
  return (await jsonOrThrow(response)) as CoinDcxMarketDetail[];
}

export async function getCoinDcxTradeHistory(
  pair: string,
  limit = 10,
) {
  const query = new URLSearchParams({
    pair,
    limit: String(Math.min(Math.max(limit, 1), 500)),
  });

  const response = await fetch(
    `${PUBLIC}/market_data/trade_history?${query}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );

  return (await jsonOrThrow(response)) as Array<{
    p: number | string;
    q?: number | string;
    s?: string;
    T: number | string;
    m?: boolean;
  }>;
}

export async function getCoinDcxCandles(
  pair: string,
  interval: string,
  limit = 500,
) {
  const query = new URLSearchParams({
    pair,
    interval,
    limit: String(Math.min(Math.max(limit, 1), 1000)),
  });
  const response = await fetch(`${PUBLIC}/market_data/candles?${query}`, {
    cache: "no-store",
  });
  return (await jsonOrThrow(response)) as Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
  }>;
}

export async function getCoinDcxFuturesActiveInstruments() {
  const response=await fetch(`${API}/exchange/v1/derivatives/futures/data/active_instruments?margin_currency_short_name[]=USDT`,{cache:"no-store"});
  return (await jsonOrThrow(response)) as string[];
}
export async function getCoinDcxFuturesTrades(pair:string) {
  const response=await fetch(`${API}/exchange/v1/derivatives/futures/data/trades?pair=${encodeURIComponent(pair)}`,{cache:"no-store"});
  return (await jsonOrThrow(response)) as Array<{price:number|string;quantity:number|string;timestamp:number|string;is_maker?:boolean}>;
}
export async function getCoinDcxFuturesCandles(pair:string,resolution:string,from:number,to:number) {
  const q=new URLSearchParams({pair,from:String(from),to:String(to),resolution,pcode:"f"});
  const response=await fetch(`${PUBLIC}/market_data/candlesticks?${q}`,{cache:"no-store"});
  return (await jsonOrThrow(response)) as {s?:string;data?:Array<{open:number;high:number;low:number;close:number;volume:number;time:number}>};
}
