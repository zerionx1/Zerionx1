import "server-only";

import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { adminSelect } from "@/lib/supabase/admin-rest";

type BrokerTokenPayload = Record<string, unknown>;

type UpstoxWorkerConnection = {
  connectionId: string;
  ownerId: string;
  accessToken: string;
};

function accessTokenFrom(payload: BrokerTokenPayload) {
  const token = payload.access_token;

  if (typeof token !== "string" || !token) {
    throw new Error("Upstox access token is missing");
  }

  return token;
}

export async function listConnectedUpstoxWorkerConnections(): Promise<
  UpstoxWorkerConnection[]
> {
  const rows = await adminSelect(
    "broker_connections",
    "broker_key=eq.upstox&status=eq.connected&select=id,owner_id,metadata",
  );

  const connections: UpstoxWorkerConnection[] = [];

  for (const row of rows) {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const sealed = metadata.token_envelope;

    if (typeof sealed !== "string" || !sealed) {
      continue;
    }

    const token = openBrokerSecret<BrokerTokenPayload>(sealed);

    connections.push({
      connectionId: String(row.id),
      ownerId: String(row.owner_id),
      accessToken: accessTokenFrom(token),
    });
  }

  return connections;
}
