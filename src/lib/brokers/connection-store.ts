import "server-only";

import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { currentUser, select } from "@/lib/supabase/rest";

type BrokerTokenPayload = Record<string, unknown>;

export async function getConnectedBrokerConnection(brokerKey: "upstox" | "ctrader") {
  const user = await currentUser();
  const rows = await select(
    "broker_connections",
    `owner_id=eq.${user.id}&broker_key=eq.${brokerKey}&status=eq.connected&limit=1`,
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`${brokerKey} account is not connected`);
  }

  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const sealed = metadata.token_envelope;

  if (typeof sealed !== "string" || !sealed) {
    throw new Error(`${brokerKey} token envelope is missing`);
  }

  return {
    row,
    user,
    token: openBrokerSecret<BrokerTokenPayload>(sealed),
  };
}
