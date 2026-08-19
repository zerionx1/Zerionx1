import { brokerConfigured } from "@/lib/brokers/oauth-config";
import { ok } from "@/lib/security/api-response";

export async function GET() {
  const coinDcxApiKey = Boolean(process.env.COINDCX_API_KEY);
  const coinDcxApiSecret = Boolean(process.env.COINDCX_API_SECRET);

  return ok({
    upstox: {
      configured: brokerConfigured("upstox"),
      clientId: Boolean(process.env.UPSTOX_CLIENT_ID),
      clientSecret: Boolean(process.env.UPSTOX_CLIENT_SECRET),
      redirectUri: Boolean(process.env.UPSTOX_REDIRECT_URI),
      encryptionKey: Boolean(process.env.BROKER_TOKEN_ENCRYPTION_KEY),
    },
    coindcx: {
      configured:
        coinDcxApiKey &&
        coinDcxApiSecret &&
        Boolean(process.env.BROKER_TOKEN_ENCRYPTION_KEY),
      apiKey: coinDcxApiKey,
      apiSecret: coinDcxApiSecret,
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
