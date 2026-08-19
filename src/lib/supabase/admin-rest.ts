import "server-only";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase admin configuration is missing");
  }
  return { url: url.replace(/\/$/, ""), serviceRole };
}

export async function adminRest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { url, serviceRole } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceRole,
      ...(serviceRole.startsWith("eyJ")
        ? { Authorization: `Bearer ${serviceRole}` }
        : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body || `Supabase admin request failed (${response.status})`,
    );
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const adminSelect = (table: string, query = "") =>
  adminRest<Record<string, unknown>[]>(`${table}?${query}`, { method: "GET" });

export const adminInsert = <T>(
  table: string,
  payload: unknown,
  prefer = "return=representation",
) =>
  adminRest<T[]>(table, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Prefer: prefer },
  });
