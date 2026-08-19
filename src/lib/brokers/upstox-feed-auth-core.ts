export async function getUpstoxMarketDataFeedV3AuthorizeUrlForAccessToken(
  accessToken: string,
) {
  const response = await fetch(
    "https://api.upstox.com/v3/feed/market-data-feed/authorize",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const json = (await response.json().catch(() => null)) as {
    data?: {
      authorized_redirect_uri?: string;
    };
    errors?: Array<{ message?: string }>;
  } | null;

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.message ??
        `Upstox Market Data Feed V3 authorization failed (${response.status})`,
    );
  }

  const url = json?.data?.authorized_redirect_uri;

  if (!url || !url.startsWith("wss://")) {
    throw new Error("Upstox V3 authorized WebSocket URL is missing");
  }

  return url;
}
