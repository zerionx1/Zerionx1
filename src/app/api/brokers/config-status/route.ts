import { ok } from "@/lib/security/api-response";
import { brokerConfigured } from "@/lib/brokers/oauth-config";

export async function GET() {
  return ok({
    upstox: {
      configured: brokerConfigured("upstox"),
      clientId: Boolean(process.env.UPSTOX_CLIENT_ID),
      clientSecret: Boolean(process.env.UPSTOX_CLIENT_SECRET),
      redirectUri: Boolean(process.env.UPSTOX_REDIRECT_URI),
      encryptionKey: Boolean(process.env.BROKER_TOKEN_ENCRYPTION_KEY),
    },
    ctrader: {
      configured: brokerConfigured("ctrader"),
      clientId: Boolean(process.env.CTRADER_CLIENT_ID),
      clientSecret: Boolean(process.env.CTRADER_CLIENT_SECRET),
      redirectUri: Boolean(process.env.CTRADER_REDIRECT_URI),
      encryptionKey: Boolean(process.env.BROKER_TOKEN_ENCRYPTION_KEY),
    },
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  });
}
