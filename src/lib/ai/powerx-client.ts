import "server-only";

import { zerionToolDescriptions } from "@/lib/ai/zerion-tools";

export type PowerXMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function askPowerX(input: {
  messages: PowerXMessage[];
  context?: Record<string, unknown>;
}) {
  const baseUrl = process.env.POWERX_BASE_URL;
  const apiKey = process.env.POWERX_API_KEY;

  if (!baseUrl) {
    return {
      available: false,
      message:
        "PowerX is not connected yet. Zerion deterministic tools remain available.",
      toolCalls: [],
    };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/zerion/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      messages: input.messages,
      context: input.context ?? {},
      tools: zerionToolDescriptions,
      policy: {
        liveExecutionRequiresExplicitUserConfirmation: true,
        doNotInventMarketData: true,
        rejectWhenDataIsStale: true,
      },
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (json as { error?: { message?: string } } | null)?.error?.message ??
        `PowerX request failed (${response.status})`,
    );
  }

  return {
    available: true,
    ...(json as Record<string, unknown>),
  };
}
