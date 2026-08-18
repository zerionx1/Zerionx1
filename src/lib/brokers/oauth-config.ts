import "server-only";

export type OAuthBrokerKey = "upstox" | "ctrader";

export function callbackUrl(request: Request, broker: OAuthBrokerKey): string {
  const envName =
    broker === "upstox" ? "UPSTOX_REDIRECT_URI" : "CTRADER_REDIRECT_URI";
  const configured = process.env[envName];

  if (configured) return configured;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return `${appUrl}/api/brokers/${broker}/callback`;
}

export function brokerConfigured(broker: OAuthBrokerKey): boolean {
  if (broker === "upstox") {
    return Boolean(
      process.env.UPSTOX_CLIENT_ID &&
        process.env.UPSTOX_CLIENT_SECRET &&
        process.env.BROKER_TOKEN_ENCRYPTION_KEY,
    );
  }

  return Boolean(
    process.env.CTRADER_CLIENT_ID &&
      process.env.CTRADER_CLIENT_SECRET &&
      process.env.BROKER_TOKEN_ENCRYPTION_KEY,
  );
}

export function authorizationUrl(
  request: Request,
  broker: OAuthBrokerKey,
  state: string,
): string {
  const redirectUri = callbackUrl(request, broker);

  if (broker === "upstox") {
    const clientId = process.env.UPSTOX_CLIENT_ID;
    if (!clientId) throw new Error("UPSTOX_CLIENT_ID is not configured");

    const url = new URL(
      "https://api.upstox.com/v2/login/authorization/dialog",
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  const clientId = process.env.CTRADER_CLIENT_ID;
  if (!clientId) throw new Error("CTRADER_CLIENT_ID is not configured");

  const url = new URL(
    "https://id.ctrader.com/my/settings/openapi/grantingaccess/",
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "trading");
  url.searchParams.set("product", "web");
  return url.toString();
}
