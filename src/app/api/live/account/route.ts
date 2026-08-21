import { ok, fail } from "@/lib/security/api-response";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import {
  getCTraderAccountState,
  listCTraderAccounts,
} from "@/lib/brokers/ctrader-json-client";
import {
  getCoinDcxBalances,
  verifyCoinDcxCredentials,
} from "@/lib/brokers/coindcx-core";
import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { currentUser, select } from "@/lib/supabase/rest";

type CoinDcxEnvelope = {
  api_key?: string;
  api_secret?: string;
};

async function connectedCoinDcxCredentials() {
  const user = await currentUser();

  const connection = (
    await select(
      "broker_connections",
      `owner_id=eq.${user.id}&broker_key=eq.coindcx&status=eq.connected&limit=1`,
    )
  )[0];

  if (!connection) {
    throw new Error("CoinDCX account is not connected.");
  }

  const metadata = connection.metadata as
    | Record<string, unknown>
    | undefined;

  const sealed = String(metadata?.token_envelope ?? "");

  if (!sealed) {
    throw new Error(
      "CoinDCX connection is missing its encrypted credential envelope. Reconnect the account.",
    );
  }

  const payload = openBrokerSecret<CoinDcxEnvelope>(sealed);
  const apiKey = payload.api_key?.trim() ?? "";
  const apiSecret = payload.api_secret?.trim() ?? "";

  if (!apiKey || !apiSecret) {
    throw new Error(
      "CoinDCX encrypted credentials are incomplete. Reconnect the account.",
    );
  }

  return { apiKey, apiSecret };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const broker = url.searchParams.get("broker");

  try {
    if (broker === "upstox") {
      const [
        profile,
        funds,
        positions,
        holdings,
        orders,
        trades,
      ] = await Promise.all([
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

    if (broker === "coindcx") {
      const credentials =
        await connectedCoinDcxCredentials();

      const [accountInfo, balances] =
        await Promise.all([
          verifyCoinDcxCredentials(credentials),
          getCoinDcxBalances(credentials),
        ]);

      return ok({
        broker: "coindcx",
        accountInfo,
        balances,
      });
    }

    if (broker === "ctrader") {
      const accountId =
        url.searchParams.get("accountId");
      const isLive =
        url.searchParams.get("environment") !== "demo";

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
        ...(await getCTraderAccountState(
          accountId,
          isLive,
        )),
      });
    }

    return fail(
      "VALIDATION_ERROR",
      "broker must be upstox, coindcx or ctrader",
      400,
    );
  } catch (error) {
    return fail(
      "BROKER_SYNC_FAILED",
      error instanceof Error
        ? error.message
        : "Broker sync failed",
      502,
    );
  }
}
