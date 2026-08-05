export interface WatchlistItem { id: string; instrumentId: string; symbol: string; addedAt: string; notes?: string; }
export interface Watchlist { id: string; userId: string; name: string; isDefault: boolean; items: WatchlistItem[]; createdAt: string; updatedAt: string; }
