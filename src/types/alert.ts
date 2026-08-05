export type AlertOperator = "above" | "below" | "crosses-above" | "crosses-below";
export type AlertStatus = "active" | "triggered" | "paused" | "expired";
export interface PriceAlert { id: string; userId: string; symbol: string; operator: AlertOperator; threshold: number; status: AlertStatus; channels: ("in-app"|"email"|"push")[]; createdAt: string; triggeredAt?: string; }
