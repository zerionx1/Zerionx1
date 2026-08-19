import "server-only";

import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { currentUser, select } from "@/lib/supabase/rest";
import {
  getCoinDcxBalances,
  verifyCoinDcxCredentials,
  type CoinDcxCredentials,
} from "@/lib/brokers/coindcx-core";

type StoredCoinDcxSecret = {
  api_key?: string;
  api_secret?: string;
};

export async function getConnectedCoinDcxCredentials(): Promise<CoinDcxCredentials> {
  const user = await currentUser();
  const rows = await select(
    "broker_connections",
    `owner_id=eq.${user.id}&broker_key=eq.coindcx&status=eq.connected&order=updated_at.desc&limit=1`,
  );

  const row = rows[0];
  if (!row) throw new Error("coindcx account is not connected");

  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const sealed = metadata.token_envelope;
  if (typeof sealed !== "string" || !sealed) {
    throw new Error("CoinDCX credential envelope is missing");
  }

  const secret = openBrokerSecret<StoredCoinDcxSecret>(sealed);
  if (!secret.api_key || !secret.api_secret) {
    throw new Error("CoinDCX API credentials are missing");
  }

  return {
    apiKey: secret.api_key,
    apiSecret: secret.api_secret,
  };
}

export const coinDcxClient = {
  async info() {
    return verifyCoinDcxCredentials(await getConnectedCoinDcxCredentials());
  },
  async balances() {
    return getCoinDcxBalances(await getConnectedCoinDcxCredentials());
  },
};
