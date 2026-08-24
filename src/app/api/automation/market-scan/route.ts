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
  "NIFTY 50", "BANKNIFTY", "FINNIFTY", "RELIANCE", "HDFCBANK", "ICICIBANK",
  "SBIN", "TCS", "INFY", "BHARTIARTL", "ITC", "LT", "AXISBANK", "KOTAKBANK",
  "MARUTI", "TATAMOTORS", "SUNPHARMA", "HINDUNILVR",
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "BNB/USDT", "ADA/USDT",
  "DOGE/USDT", "AVAX/USDT", "LINK/USDT",
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD",
];

export async function GET(request: Request) {
  if (!allowed(request)) return fail("UNAUTHORIZED", "Cron authorization required", 401);

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
      qualifiedCount: scan.candidates.filter((candidate) =>
        candidate.direction !== "neutral" &&
        candidate.confidence >= 70 &&
        Number(candidate.tradePlan?.qualityScore ?? 0) >= 74 &&
        Number(candidate.tradePlan?.riskReward ?? 0) >= 3
      ).length,
      persistedCount: persisted.length,
      delivery,
      executionPolicy: "user-approval-required",
      scanCadenceSeconds: 30,
      signalPolicy: "continuous-bidirectional-quality-gated-minimum-1-to-3",
    });
  } catch (error) {
    return fail(
      "MARKET_SCAN_FAILED",
      error instanceof Error ? error.message : "Market scan failed",
      500,
    );
  }
}
