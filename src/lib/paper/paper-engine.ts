import { paperTradingPolicy } from "@/config/paper-trading";
import type { MarketQuote } from "@/types/market";
import type { PaperAccount, PaperOrder } from "@/types/paper-trading";

export interface PlacePaperOrderInput {
  account: PaperAccount;
  quote: MarketQuote;
  order: PaperOrder;
  riskOverrideConfirmed?: boolean;
}

export interface PaperExecutionResult {
  accepted: boolean;
  order: PaperOrder;
  fees: number;
  reason?: string;
  guard?: {
    proposedNotional: number;
    defaultGuardNotional: number;
    defaultGuardPercent: number;
  };
}

export function executePaperOrder({
  account,
  quote,
  order,
  riskOverrideConfirmed = false,
}: PlacePaperOrderInput): PaperExecutionResult {
  const notional = order.quantity * quote.price;
  const guardPercent = paperTradingPolicy.maxOrderNotionalPercent;
  const max = account.equity * (guardPercent / 100);

  if (order.quantity <= 0) {
    return {
      accepted: false,
      order: { ...order, status: "rejected", rejectionReason: "Quantity must be positive" },
      fees: 0,
      reason: "invalid_quantity",
    };
  }

  if (notional > max && !riskOverrideConfirmed) {
    return {
      accepted: false,
      order: {
        ...order,
        status: "rejected",
        rejectionReason:
          "This paper order is larger than Zerion's default notional guard. Explicit user confirmation is required to continue.",
      },
      fees: 0,
      reason: "risk_confirmation_required",
      guard: {
        proposedNotional: notional,
        defaultGuardNotional: max,
        defaultGuardPercent: guardPercent,
      },
    };
  }

  if (order.side === "buy" && notional > account.buyingPower) {
    return {
      accepted: false,
      order: { ...order, status: "rejected", rejectionReason: "Insufficient paper buying power" },
      fees: 0,
      reason: "buying_power",
    };
  }

  const slip =
    quote.price *
    (paperTradingPolicy.slippageBasisPoints / 10_000) *
    (order.side === "buy" ? 1 : -1);
  const fill = quote.price + slip;
  const fees = fill * order.quantity * (paperTradingPolicy.commissionBasisPoints / 10_000);

  return {
    accepted: true,
    fees,
    order: {
      ...order,
      status: "filled",
      filledQuantity: order.quantity,
      averageFillPrice: fill,
      updatedAt: new Date().toISOString(),
    },
  };
}
