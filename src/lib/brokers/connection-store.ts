import "server-only";

import { openBrokerSecret } from "@/lib/brokers/token-vault";
import { currentUser, select } from "@/lib/supabase/rest";

type BrokerSecretPayload = Record<string, unknown>;
export type ConnectedBrokerKey = "upstox" | "coindcx" | "exness-mt5";

export async function getConnectedBrokerConnection(brokerKey: ConnectedBrokerKey) {
  const user = await currentUser();
  const rows = await select(
    "broker_connections",
    `owner_id=eq.${user.id}&broker_key=eq.${brokerKey}&status=eq.connected&limit=1`,
  );
  const row = rows[0];
  if (!row) throw new Error(`${brokerKey} account is not connected`);
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const sealed = metadata.token_envelope;
  if (typeof sealed !== "string" || !sealed) {
    throw new Error(`${brokerKey} encrypted credential envelope is missing`);
  }
  return { row, user, token: openBrokerSecret<BrokerSecretPayload>(sealed) };
}

export type Mt5UserCredentials = {
  login: string;
  password: string;
  server: string;
  environment: "demo" | "real";
};

export async function getConnectedMt5Credentials(): Promise<Mt5UserCredentials> {
  const { token } = await getConnectedBrokerConnection("exness-mt5");
  const login = String(token.login ?? "").trim();
  const password = String(token.password ?? "");
  const server = String(token.server ?? "").trim();
  const environment = String(token.environment ?? "demo").toLowerCase() === "real" ? "real" : "demo";
  if (!login || !password || !server) {
    throw new Error("Exness MT5 encrypted credentials are incomplete. Reconnect the account.");
  }
  return { login, password, server, environment };
}
