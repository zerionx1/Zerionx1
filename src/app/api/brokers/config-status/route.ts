import { brokerConfigured } from "@/lib/brokers/oauth-config";
import { mt5BridgeConfigured } from "@/lib/brokers/mt5-bridge-client";
import { ok } from "@/lib/security/api-response";

export async function GET() {
  const encryptionKey = Boolean(process.env.BROKER_TOKEN_ENCRYPTION_KEY);
  return ok({
    upstox: {
      configured: brokerConfigured("upstox"),
      clientId: Boolean(process.env.UPSTOX_CLIENT_ID),
      clientSecret: Boolean(process.env.UPSTOX_CLIENT_SECRET),
      redirectUri: Boolean(process.env.UPSTOX_REDIRECT_URI),
      encryptionKey,
      authMode: "oauth",
    },
    coindcx: {
      configured: encryptionKey,
      encryptionKey,
      authMode: "user-api-credentials",
      userCredentialsRequired: true,
    },
    "exness-mt5": {
      configured: mt5BridgeConfigured(),
      encryptionKey,
      bridgeUrl: Boolean(process.env.MT5_BRIDGE_URL),
      bridgeToken: Boolean(process.env.MT5_BRIDGE_TOKEN),
      authMode: "user-mt5-credentials",
      userCredentialsRequired: true,
    },
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  });
}
