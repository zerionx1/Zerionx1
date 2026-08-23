import { runZerionScan } from "@/lib/agents/orchestrator";
import { persistScanOpportunities } from "@/lib/agents/opportunity-store";
import { dispatchOpportunityNotifications } from "@/lib/notifications/opportunity-dispatch";
import { fail, ok } from "@/lib/security/api-response";

function allowed(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

const DEFAULT_UNIVERSE = [
  // India
  "NIFTY 50",
  "BANKNIFTY",
  "FINNIFTY",
  "RELIANCE",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "TCS",
  "INFY",
  "BHARTIARTL",
  "ITC",
  "LT",
  "AXISBANK",
  "KOTAKBANK",
  "MARUTI",
  "TATAMOTORS",
  "SUNPHARMA",
  "HINDUNILVR",
  // Crypto
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "BNB/USDT",
  "ADA/USDT",
  "DOGE/USDT",
  "AVAX/USDT",
  "LINK/USDT",
  // Forex / metals - active only when the configured provider resolves them
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
];

export async function GET(request: Request) {
  if (!allowed(request)) {
    return fail("UNAUTHORIZED", "Cron authorization required", 401);
  }

  const raw = process.env.ZERION_SCAN_SYMBOLS;
  const symbols = raw
    ? raw.split(",").map((value) => value.trim()).filter(Boolean)
    : DEFAULT_UNIVERSE;

  try {
    const scan = await runZerionScan([...new Set(symbols)]);
    const persisted = await persistScanOpportunities(scan);
    const delivery = await dispatchOpportunityNotifications(persisted);

    return ok({
      ...scan,
      scannedSymbols: symbols.length,
      qualifiedCount: scan.candidates.filter(
        (c) => c.direction !== "neutral" && c.confidence >= 64,
      ).length,
      persistedCount: persisted.length,
      delivery,
      executionPolicy: "user-approval-required",
      signalPolicy:
        "bidirectional-multi-factor-dynamic-validity-anti-overtrading",
    });
  } catch (error) {
    return fail(
      "MARKET_SCAN_FAILED",
      error instanceof Error ? error.message : "Market scan failed",
      500,
    );
  }
}
