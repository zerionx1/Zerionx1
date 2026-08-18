import { fail, ok } from "@/lib/security/api-response";
import { runZerionScan } from "@/lib/agents/orchestrator";
import { persistScanOpportunities } from "@/lib/agents/opportunity-store";

function allowed(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!allowed(request))
    return fail("UNAUTHORIZED", "Cron authorization required", 401);

  const raw =
    process.env.ZERION_SCAN_SYMBOLS ??
    "BTC/USDT,ETH/USDT,NIFTY 50,BANKNIFTY,RELIANCE,EUR/USD,XAU/USD";

  const symbols = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  try {
    const scan = await runZerionScan(symbols);
    const persisted = await persistScanOpportunities(scan);
    return ok({
      ...scan,
      persistedCount: persisted.length,
      executionPolicy: "user-approval-required",
    });
  } catch (error) {
    return fail(
      "MARKET_SCAN_FAILED",
      error instanceof Error ? error.message : "Market scan failed",
      500,
    );
  }
}
