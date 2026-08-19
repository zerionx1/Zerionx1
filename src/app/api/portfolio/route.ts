import { upstoxClient } from "@/lib/brokers/upstox-client";
import { fail, ok } from "@/lib/security/api-response";
import type {
  LivePosition,
  PortfolioAccount,
  PortfolioSnapshot,
} from "@/types/portfolio";
import type { MarketKind } from "@/types/market";

type UpstoxPosition = {
  exchange?: string;
  instrument_token?: string;
  trading_symbol?: string;
  tradingsymbol?: string;
  quantity?: number;
  average_price?: number | null;
  last_price?: number;
  realised?: number;
  unrealised?: number;
  pnl?: number;
};

type UpstoxHolding = {
  exchange?: string;
  instrument_token?: string;
  trading_symbol?: string;
  tradingsymbol?: string;
  quantity?: number;
  average_price?: number | null;
  last_price?: number;
  pnl?: number;
};

function marketKind(exchange = "", instrument = ""): MarketKind {
  const value = `${exchange}:${instrument}`.toUpperCase();
  if (value.includes("MCX")) return "commodity";
  if (value.includes("NSE_FO") || value.includes("NFO")) {
    return instrument.includes("CE") || instrument.includes("PE")
      ? "indian-options"
      : "indian-futures";
  }
  return "indian-equity";
}

function positionFrom(
  row: UpstoxPosition | UpstoxHolding,
  index: number,
  holding = false,
): LivePosition {
  const symbol = String(row.trading_symbol ?? row.tradingsymbol ?? "UNKNOWN");
  const lastPrice = Number(row.last_price ?? 0);
  const averagePrice = Number(row.average_price ?? 0);
  const quantity = Number(row.quantity ?? 0);
  const realised = holding ? 0 : Number((row as UpstoxPosition).realised ?? 0);
  const unrealised = holding
    ? Number((row as UpstoxHolding).pnl ?? 0)
    : Number((row as UpstoxPosition).unrealised ?? (row as UpstoxPosition).pnl ?? 0);

  return {
    id: String(row.instrument_token ?? `${symbol}:${index}`),
    connectionId: "upstox",
    market: marketKind(String(row.exchange ?? ""), symbol),
    symbol,
    quantity,
    averagePrice,
    lastPrice,
    realisedPnl: realised,
    unrealisedPnl: unrealised,
    updatedAt: new Date().toISOString(),
  };
}

function numberAt(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return 0;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" ? current : Number(current ?? 0) || 0;
}

export async function GET() {
  try {
    const [fundsRaw, positionsRaw, holdingsRaw] = await Promise.all([
      upstoxClient.funds(),
      upstoxClient.positions(),
      upstoxClient.holdings(),
    ]);

    const fundsData = (fundsRaw as { data?: unknown })?.data ?? {};
    const positions = Array.isArray((positionsRaw as { data?: unknown[] })?.data)
      ? ((positionsRaw as { data: UpstoxPosition[] }).data ?? [])
      : [];
    const holdings = Array.isArray((holdingsRaw as { data?: unknown[] })?.data)
      ? ((holdingsRaw as { data: UpstoxHolding[] }).data ?? [])
      : [];

    const availableMargin = numberAt(fundsData, ["available_to_trade", "total"]);
    const cash = numberAt(fundsData, [
      "available_to_trade",
      "cash_available_to_trade",
      "total",
    ]);
    const usedMargin =
      numberAt(fundsData, [
        "available_to_trade",
        "cash_available_to_trade",
        "margin_used",
        "total",
      ]) +
      numberAt(fundsData, [
        "available_to_trade",
        "pledge_available_to_trade",
        "margin_used",
        "total",
      ]);

    const livePositions = [
      ...positions.map((row, index) => positionFrom(row, index)),
      ...holdings.map((row, index) => positionFrom(row, index, true)),
    ];

    const totalUnrealisedPnl = livePositions.reduce(
      (sum, row) => sum + row.unrealisedPnl,
      0,
    );

    const marketValue = livePositions.reduce(
      (sum, row) => sum + Math.max(0, row.quantity) * row.lastPrice,
      0,
    );

    const accounts: PortfolioAccount[] = [
      {
        connectionId: "upstox",
        currency: "INR",
        cash,
        availableMargin,
        usedMargin,
        netLiquidation: availableMargin + marketValue,
        syncedAt: new Date().toISOString(),
      },
    ];

    const snapshot: PortfolioSnapshot = {
      accounts,
      positions: livePositions,
      totalEquity: availableMargin + marketValue,
      totalUnrealisedPnl,
      capturedAt: new Date().toISOString(),
    };

    return ok(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sync Upstox portfolio";

    if (message.toLowerCase().includes("not connected")) {
      return ok(null);
    }

    return fail("BROKER_SYNC_FAILED", message, 502);
  }
}
