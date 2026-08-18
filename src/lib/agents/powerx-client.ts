import "server-only";
import type { ZerionAgentId } from "./registry";
export type PowerXRequest = {
  agent: ZerionAgentId;
  task: string;
  context: unknown;
};
export async function callPowerX(input: PowerXRequest) {
  const base = process.env.POWERX_API_BASE_URL;
  const token = process.env.POWERX_API_TOKEN;
  if (!base) return null;
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/v1/zerion/agent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}
