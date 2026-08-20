import type { MarketKind } from "@/types/market";
export type PaperOrderSide = "buy" | "sell";
export type PaperOrderType = "market" | "limit" | "stop" | "stop-limit";
export type PaperOrderStatus = "draft" | "pending" | "filled" | "partially-filled" | "cancelled" | "rejected";
export interface PaperOrder {
  id: string; accountId: string; symbol: string; market: MarketKind;
  side: PaperOrderSide; type: PaperOrderType; quantity: number;
  limitPrice?: number; stopPrice?: number; stopLoss?: number; targetPrice?: number;
  maxLoss?: number; maxProfit?: number; averageFillPrice?: number;
  filledQuantity: number; status: PaperOrderStatus; createdAt: string; updatedAt: string;
  clientOrderId: string; rejectionReason?: string;
}
export interface PaperPosition {
  id: string; accountId: string; symbol: string; market: MarketKind;
  quantity: number; averagePrice: number; markPrice: number;
  unrealizedPnl: number; realizedPnl: number; openedAt: string;
  stopLoss?: number; targetPrice?: number;
}
export interface PaperAccount {
  id: string; userId: string; name: string; currency: string;
  startingBalance: number; cashBalance: number; equity: number;
  buyingPower: number; dailyPnl: number; totalPnl: number;
  createdAt: string; resetAt?: string;
}
