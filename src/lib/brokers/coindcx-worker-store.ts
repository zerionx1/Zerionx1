import { openBrokerSecretCore } from "@/lib/brokers/token-vault-core";
import { adminSelectCore } from "@/lib/supabase/admin-rest-core";
import type { CoinDcxCredentials } from "@/lib/brokers/coindcx-core";

type StoredCoinDcxSecret = {
  api_key?: string;
  api_secret?: string;
};

export type CoinDcxWorkerConnection = {
  connectionId: string;
  ownerId: string;
  credentials: CoinDcxCredentials;
};

export async function scanConnectedCoinDcxWorkerConnections() {
  const rows = await adminSelectCore(
    "broker_connections",
    "broker_key=eq.coindcx&status=eq.connected&select=id,owner_id,metadata,updated_at&order=updated_at.desc",
  );

  const connections: CoinDcxWorkerConnection[] = [];
  const owners = new Set<string>();
  let skipped = 0;

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
      const secret = openBrokerSecretCore<StoredCoinDcxSecret>(sealed);
      if (!secret.api_key || !secret.api_secret) {
        skipped += 1;
        continue;
      }

      connections.push({
        connectionId: String(row.id),
        ownerId,
        credentials: {
          apiKey: secret.api_key,
          apiSecret: secret.api_secret,
        },
      });
      owners.add(ownerId);
    } catch {
      skipped += 1;
    }
  }

  return { connections, skipped };
}
