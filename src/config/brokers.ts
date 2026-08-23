import type { BrokerAdapterDescriptor } from "@/types/broker";

export const brokerCatalog: BrokerAdapterDescriptor[] = [
  {
    key: "upstox",
    name: "Upstox",
    kind: "india",
    authMode: "oauth",
    supportsSandbox: true,
    availability: "available",
    description: "Indian-market account connection and execution through Upstox.",
    createAccountUrl: "https://upstox.onelink.me/0H1s/75BFXW",
    capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true },
  },
  {
    key: "exness-mt5",
    name: "Exness MT5",
    kind: "forex",
    authMode: "session",
    supportsSandbox: true,
    availability: "available",
    description: "Connect your own Exness MetaTrader 5 account. Zerion encrypts your MT5 credentials and routes Forex execution through the MT5 Bridge.",
    createAccountUrl: "https://www.exness.com/",
    capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: false },
  },
  {
    key: "coindcx",
    name: "CoinDCX",
    kind: "crypto",
    authMode: "api-key",
    supportsSandbox: false,
    availability: "available",
    description: "Connect CoinDCX for crypto balances, realtime spot prices, candles and account events.",
    createAccountUrl: "https://coindcx.com/",
    capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true },
  },
];
