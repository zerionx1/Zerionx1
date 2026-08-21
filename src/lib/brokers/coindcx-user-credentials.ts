export function normalizeCoinDcxUserCredentials(
  apiKey: string,
  apiSecret: string,
) {
  const normalized = {
    apiKey: apiKey.trim(),
    apiSecret: apiSecret.trim(),
  };

  if (!normalized.apiKey || !normalized.apiSecret) {
    throw new Error(
      "CoinDCX API Key and API Secret are required.",
    );
  }

  return normalized;
}
