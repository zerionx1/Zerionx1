import { coinDcxClient } from "@/lib/brokers/coindcx-client";
import { fail, ok } from "@/lib/security/api-response";

export async function GET() {
  try {
    const [info, balances] = await Promise.all([
      coinDcxClient.info(),
      coinDcxClient.balances(),
    ]);

    return ok({
      connected: true,
      info,
      balances: balances.filter(
        (row) => Number(row.balance) > 0 || Number(row.locked_balance) > 0,
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "CoinDCX account sync failed";

    if (message.toLowerCase().includes("not connected")) {
      return ok({ connected: false, balances: [] });
    }

    return fail("COINDCX_SYNC_FAILED", message, 502);
  }
}
