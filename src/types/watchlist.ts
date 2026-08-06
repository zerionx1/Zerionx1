import type { MarketKind } from "@/types/market";

export interface WatchlistItem {
  id: string;
  instrumentId: string;
  symbol: string;
  addedAt: string;
  notes?: string;
  displayName?: string;
  exchange?: string;
  market?: MarketKind;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  isDefault: boolean;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}
