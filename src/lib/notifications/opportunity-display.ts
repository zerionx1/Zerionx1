export type OpportunityDisplayData = Record<string, unknown>;

export function directionOf(data: OpportunityDisplayData) {
  return String(data.direction ?? data.side ?? "").trim().toUpperCase();
}

export function expiryOf(data: OpportunityDisplayData) {
  const raw = String(data.expiresAt ?? data.expires_at ?? "");
  const value = Date.parse(raw);
  return Number.isFinite(value) ? value : null;
}

export function isOpportunityExpired(
  data: OpportunityDisplayData,
  now = Date.now(),
) {
  const expires = expiryOf(data);
  return expires !== null && expires <= now;
}

export function displayNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "—";
}
