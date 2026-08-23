import "server-only";

export type OAuthBrokerKey = "upstox";

export function callbackUrl(request: Request, broker: OAuthBrokerKey): string {
  const configured = process.env.UPSTOX_REDIRECT_URI;
  if (configured) return configured;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return `${appUrl}/api/brokers/${broker}/callback`;
}

export function brokerConfigured(_: OAuthBrokerKey): boolean {
  return Boolean(
    process.env.UPSTOX_CLIENT_ID &&
      process.env.UPSTOX_CLIENT_SECRET &&
      process.env.BROKER_TOKEN_ENCRYPTION_KEY,
  );
}

export function authorizationUrl(request: Request, _broker: OAuthBrokerKey, state: string): string {
  const clientId = process.env.UPSTOX_CLIENT_ID;
  if (!clientId) throw new Error("UPSTOX_CLIENT_ID is not configured");
  const url = new URL("https://api.upstox.com/v2/login/authorization/dialog");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl(request, "upstox"));
  url.searchParams.set("state", state);
  return url.toString();
}
