import type { BrokerAdapterDescriptor } from "@/types/broker";

/*
  Broker/platform catalog.
  A descriptor means Zerion X1 supports an integration path; it does NOT imply
  that the user's account is authenticated or that data is licensed.
*/
export const brokerCatalog: BrokerAdapterDescriptor[] = [
  { key: "upstox", name: "Upstox", kind: "india", authMode: "oauth", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "angel-one", name: "Angel One SmartAPI", kind: "india", authMode: "api-key", supportsSandbox: false, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "dhan", name: "DhanHQ", kind: "india", authMode: "api-key", supportsSandbox: false, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "groww", name: "Groww Trading API", kind: "india", authMode: "api-key", supportsSandbox: false, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: false } },

  { key: "binance", name: "Binance", kind: "crypto", authMode: "api-key", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "coinbase", name: "Coinbase Advanced", kind: "crypto", authMode: "api-key", supportsSandbox: false, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "kraken", name: "Kraken", kind: "crypto", authMode: "api-key", supportsSandbox: false, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "okx", name: "OKX", kind: "crypto", authMode: "api-key", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },

  { key: "oanda", name: "OANDA v20", kind: "forex", authMode: "api-key", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "mt5-bridge", name: "MetaTrader 5 Bridge", kind: "forex", authMode: "session", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "mt4-bridge", name: "MetaTrader 4 Bridge", kind: "forex", authMode: "session", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
  { key: "interactive-brokers", name: "Interactive Brokers", kind: "forex", authMode: "session", supportsSandbox: true, capabilities: { marketData: true, orders: true, positions: true, funds: true, websocket: true } },
];
