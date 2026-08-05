const sensitive = /token|secret|password|authorization|api[-_]?key|cookie/i;
export function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k,v]) => [k, sensitive.test(k) ? "[REDACTED]" : redactObject(v)]));
}

export const redact = redactObject;
