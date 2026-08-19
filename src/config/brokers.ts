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
      "MT5 broker accounts will connect through the external Zerion MT5 Bridge. MT5 is the terminal/protocol layer, not the broker.",
    capabilities: {
      marketData: false,
      orders: false,
      positions: false,
      funds: false,
      websocket: false,
    },
  },
  {
    key: "coindcx-coming-soon",
    name: "CoinDCX",
    kind: "crypto",
    authMode: "session",
    supportsSandbox: false,
    availability: "coming-soon",
    description:
      "CoinDCX account, historical data and realtime socket integration is the next V1 connector after Upstox.",
    capabilities: {
      marketData: false,
      orders: false,
      positions: false,
      funds: false,
      websocket: false,
    },
  },
];
