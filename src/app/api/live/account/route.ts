import { ok, fail } from "@/lib/security/api-response";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { getCoinDcxBalances, verifyCoinDcxCredentials } from "@/lib/brokers/coindcx-core";
import { getConnectedMt5Credentials } from "@/lib/brokers/connection-store";
import { mt5BridgeClient } from "@/lib/brokers/mt5-bridge-client";
import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { currentUser, select } from "@/lib/supabase/rest";

type CoinDcxEnvelope = { api_key?: string; api_secret?: string };

async function connectedCoinDcxCredentials() {
  const user = await currentUser();
  const connection = (await select("broker_connections", `owner_id=eq.${user.id}&broker_key=eq.coindcx&status=eq.connected&limit=1`))[0];
  if (!connection) throw new Error("CoinDCX account is not connected.");
  const metadata = connection.metadata as Record<string, unknown> | undefined;
  const sealed = String(metadata?.token_envelope ?? "");
  if (!sealed) throw new Error("CoinDCX encrypted credentials are missing.");
  const payload = openBrokerSecret<CoinDcxEnvelope>(sealed);
  const apiKey = payload.api_key?.trim() ?? "";
  const apiSecret = payload.api_secret?.trim() ?? "";
  if (!apiKey || !apiSecret) throw new Error("CoinDCX encrypted credentials are incomplete.");
  return { apiKey, apiSecret };
}

export async function GET(request: Request) {
  const broker = new URL(request.url).searchParams.get("broker");
  try {
    if (broker === "upstox") {
      const [profile, funds, positions, holdings, orders, trades] = await Promise.all([
        upstoxClient.profile(), upstoxClient.funds(), upstoxClient.positions(), upstoxClient.holdings(), upstoxClient.orders(), upstoxClient.trades(),
      ]);
      return ok({ broker: "upstox", profile, funds, positions, holdings, orders, trades });
    }
    if (broker === "coindcx") {
      const credentials = await connectedCoinDcxCredentials();
      const [accountInfo, balances] = await Promise.all([verifyCoinDcxCredentials(credentials), getCoinDcxBalances(credentials)]);
      return ok({ broker: "coindcx", accountInfo, balances });
    }
    if (broker === "exness-mt5") {
      const credentials = await getConnectedMt5Credentials();
      const [account, positions] = await Promise.all([mt5BridgeClient.account(credentials), mt5BridgeClient.positions(credentials)]);
      return ok({ broker: "exness-mt5", environment: credentials.environment, account, positions });
    }
    return fail("VALIDATION_ERROR", "broker must be upstox, coindcx or exness-mt5", 400);
  } catch (error) {
    return fail("BROKER_SYNC_FAILED", error instanceof Error ? error.message : "Broker sync failed", 502);
  }
}
