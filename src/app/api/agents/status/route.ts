import { ok } from "@/lib/security/api-response";
import { zerionAgents } from "@/lib/agents/registry";
export async function GET() {
  return ok({
    agents: zerionAgents,
    powerXConfigured: Boolean(process.env.POWERX_API_BASE_URL),
    marketDataConfigured: Boolean(process.env.ZERION_MARKET_DATA_BASE_URL),
    executionPolicy: "user-approval-required",
  });
}
