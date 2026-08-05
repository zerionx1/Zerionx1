import type { Watchlist } from "@/types/watchlist";
const list:Watchlist={id:"watch-default",userId:"demo-user",name:"Primary Watchlist",isDefault:true,items:[{id:"w1",instrumentId:"nse-nifty50",symbol:"NIFTY 50",addedAt:"2026-08-01T00:00:00.000Z"},{id:"w2",instrumentId:"crypto-btcusdt",symbol:"BTC/USDT",addedAt:"2026-08-01T00:00:00.000Z"}],createdAt:"2026-08-01T00:00:00.000Z",updatedAt:"2026-08-01T00:00:00.000Z"};
export const watchlistStore={async getDefault(){return structuredClone(list)}};
