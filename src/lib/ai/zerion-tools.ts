export type ZerionToolName =
  | "market_scan"
  | "strategy_create"
  | "strategy_deploy"
  | "backtest_run"
  | "risk_check"
  | "trade_proposal_create"
  | "watchlist_update"
  | "account_sync";

export type ZerionToolCall = {
  name: ZerionToolName;
  arguments: Record<string, unknown>;
};

export const zerionToolDescriptions = [
  {
    name: "market_scan",
    purpose:
      "Read market context and identify symbols that match explicit strategy conditions.",
  },
  {
    name: "strategy_create",
    purpose:
      "Create or edit a strategy definition from clear user instructions.",
  },
  {
    name: "strategy_deploy",
    purpose:
      "Deploy a validated strategy into paper monitoring or a user-authorized live workflow.",
  },
  {
    name: "backtest_run",
    purpose:
      "Run a historical backtest and return metrics, warnings and invalidation notes.",
  },
  {
    name: "risk_check",
    purpose:
      "Calculate position size and reject a proposal that violates configured risk limits.",
  },
  {
    name: "trade_proposal_create",
    purpose:
      "Create a complete trade proposal for user review. This tool must never bypass final user confirmation.",
  },
  {
    name: "watchlist_update",
    purpose:
      "Add or remove supported symbols from the user's Zerion watchlist.",
  },
  {
    name: "account_sync",
    purpose:
      "Refresh linked broker account information and positions.",
  },
] as const;
