import { brokerConfigured } from "@/lib/brokers/oauth-config";
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
    ctrader: {
      configured: brokerConfigured("ctrader"),
      clientId: Boolean(process.env.CTRADER_CLIENT_ID),
      clientSecret: Boolean(process.env.CTRADER_CLIENT_SECRET),
      redirectUri: Boolean(process.env.CTRADER_REDIRECT_URI),
      encryptionKey,
      authMode: "oauth",
    },
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  });
}
