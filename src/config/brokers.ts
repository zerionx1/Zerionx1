import type { BrokerAdapterDescriptor } from "@/types/broker";

/*
  Production-first broker catalog for the current Zerion X1 release.

  Active now:
  - Upstox: Indian markets
  - cTrader Open API: Global Forex, through a user's cTrader-linked broker account

  Crypto is intentionally shown as Coming Soon until a production connector is
  approved and configured. This avoids showing dead cards or fake connectivity.
*/
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
    key: "ctrader",
    name: "cTrader",
    kind: "forex",
    authMode: "oauth",
    supportsSandbox: true,
    availability: "available",
    description:
      "Link a cTrader account and authorize Zerion X1 to access permitted Forex trading accounts.",
    capabilities: {
      marketData: true,
      orders: true,
      positions: true,
      funds: true,
      websocket: true,
    },
  },
  {
    key: "crypto-coming-soon",
    name: "Crypto Trading",
    kind: "crypto",
    authMode: "session",
    supportsSandbox: false,
    availability: "coming-soon",
    description:
      "Crypto live-account trading is being prepared. Public market research can remain available separately.",
    capabilities: {
      marketData: false,
      orders: false,
      positions: false,
      funds: false,
      websocket: false,
    },
  },
];
