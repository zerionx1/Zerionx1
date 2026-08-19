import { openBrokerSecretCore } from "@/lib/brokers/token-vault-core";
import { adminSelectCore } from "@/lib/supabase/admin-rest-core";

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
  const rows = await adminSelectCore(
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

    const token = openBrokerSecretCore<BrokerTokenPayload>(sealed);

    connections.push({
      connectionId: String(row.id),
      ownerId: String(row.owner_id),
      accessToken: accessTokenFrom(token),
    });
  }

  return connections;
}
