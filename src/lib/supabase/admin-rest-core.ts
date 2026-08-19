function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Supabase admin configuration is missing");
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRole,
  };
}

export async function adminRestCore<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { url, serviceRole } = config();

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
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

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const adminSelectCore = (table: string, query = "") =>
  adminRestCore<Record<string, unknown>[]>(`${table}?${query}`, {
    method: "GET",
  });
