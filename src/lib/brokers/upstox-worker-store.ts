import { openBrokerSecretCore } from "@/lib/brokers/token-vault-core";
import { adminSelectCore } from "@/lib/supabase/admin-rest-core";

type BrokerTokenPayload = Record<string, unknown>;

export type UpstoxWorkerConnection = {
  connectionId: string;
  ownerId: string;
  accessToken: string;
};

export type UpstoxWorkerConnectionScan = {
  connections: UpstoxWorkerConnection[];
  skipped: number;
};

function accessTokenFrom(payload: BrokerTokenPayload) {
  const token = payload.access_token;

  if (typeof token !== "string" || !token) {
    throw new Error("Upstox access token is missing");
  }

  return token;
}

export async function scanConnectedUpstoxWorkerConnections(): Promise<UpstoxWorkerConnectionScan> {
  const rows = await adminSelectCore(
    "broker_connections",
    "broker_key=eq.upstox&status=eq.connected&select=id,owner_id,metadata,updated_at&order=updated_at.desc",
  );

  const connections: UpstoxWorkerConnection[] = [];
  let skipped = 0;
  const owners = new Set<string>();

  for (const row of rows) {
    const ownerId = String(row.owner_id ?? "");
    if (!ownerId || owners.has(ownerId)) continue;

    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const sealed = metadata.token_envelope;

    if (typeof sealed !== "string" || !sealed) {
      skipped += 1;
      continue;
    }

    try {
      const token = openBrokerSecretCore<BrokerTokenPayload>(sealed);

      connections.push({
        connectionId: String(row.id),
        ownerId,
        accessToken: accessTokenFrom(token),
      });
      owners.add(ownerId);
    } catch {
      // Old/stale envelopes must never take the complete realtime service down.
      skipped += 1;
    }
  }

  return { connections, skipped };
}

export async function listConnectedUpstoxWorkerConnections() {
  return (await scanConnectedUpstoxWorkerConnections()).connections;
}
