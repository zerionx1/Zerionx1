import "server-only";
import type { ZerionAgentId } from "./registry";

export type PowerXRequest = {
  agent: ZerionAgentId;
  task: string;
  context: unknown;
};

export async function callPowerX(input: PowerXRequest) {
  const base = process.env.POWERX_API_BASE_URL ?? process.env.POWERX_BASE_URL;
  const token = process.env.POWERX_API_TOKEN ?? process.env.POWERX_API_KEY;
  if (!base) return null;

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/v1/zerion/agent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}
