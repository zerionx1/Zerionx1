import type { BrokerAdapterDescriptor } from "@/types/broker";

export const brokerCatalog: BrokerAdapterDescriptor[] = [
  {
    key: "upstox",
    name: "Upstox",
    kind: "india",
    authMode: "oauth",
    supportsSandbox: true,
    availability: "available",
    description:
      "Link an existing Upstox account for Indian market data and trading.",
    createAccountUrl: "https://upstox.onelink.me/0H1s/75BFXW",
    capabilities: {
      marketData: true,
      orders: true,
      positions: true,
      funds: true,
      websocket: true,
    },
  },
  {
    key: "mt5-coming-soon",
    name: "MetaTrader 5",
    kind: "forex",
    authMode: "session",
    supportsSandbox: false,
    availability: "coming-soon",
    description:
      "MT5 broker accounts will connect through the external Zerion MT5 Bridge.",
    capabilities: {
      marketData: false,
      orders: false,
      positions: false,
      funds: false,
      websocket: false,
    },
  },
  {
    key: "coindcx",
    name: "CoinDCX",
    kind: "crypto",
    authMode: "api-key",
    supportsSandbox: false,
    availability: "available",
    description:
      "Connect CoinDCX for crypto balances, realtime spot prices, candles and account events.",
    createAccountUrl: "https://coindcx.com/",
    capabilities: {
      marketData: true,
      orders: true,
      positions: true,
      funds: true,
      websocket: true,
    },
  },
];
