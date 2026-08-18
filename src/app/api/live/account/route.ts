import { ok, fail } from "@/lib/security/api-response";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import {
  getCTraderAccountState,
  listCTraderAccounts,
} from "@/lib/brokers/ctrader-json-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const broker = url.searchParams.get("broker");

  try {
    if (broker === "upstox") {
      const [profile, funds, positions, holdings, orders, trades] = await Promise.all([
        upstoxClient.profile(),
        upstoxClient.funds(),
        upstoxClient.positions(),
        upstoxClient.holdings(),
        upstoxClient.orders(),
        upstoxClient.trades(),
      ]);

      return ok({
        broker: "upstox",
        profile,
        funds,
        positions,
        holdings,
        orders,
        trades,
      });
    }

    if (broker === "ctrader") {
      const accountId = url.searchParams.get("accountId");
      const isLive = url.searchParams.get("environment") !== "demo";

      if (!accountId) {
        return ok({
          broker: "ctrader",
          accounts: await listCTraderAccounts(),
        });
      }

      return ok({
        broker: "ctrader",
        accountId,
        environment: isLive ? "live" : "demo",
        ...(await getCTraderAccountState(accountId, isLive)),
      });
    }

    return fail("VALIDATION_ERROR", "broker must be upstox or ctrader", 400);
  } catch (error) {
    return fail(
      "BROKER_SYNC_FAILED",
      error instanceof Error ? error.message : "Broker sync failed",
      502,
    );
  }
}
