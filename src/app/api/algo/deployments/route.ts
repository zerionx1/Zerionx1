import { getActivePlan } from "@/lib/billing/plan-service";
import { currentUser, insert, select } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

export async function GET() {
  try {
    const user = await currentUser();
    const rows = await select("algo_deployments", `owner_id=eq.${user.id}&order=created_at.desc`);
    return ok({ deployments: rows });
  } catch (error) {
    return fail("DEPLOYMENTS_READ_FAILED", error instanceof Error ? error.message : "Unable to load deployments", 400);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const body = await request.json();

    if (!body.name || !body.strategyId || !body.mode || !body.market || !body.symbol || !Number(body.capital)) {
      return fail("VALIDATION_ERROR", "Name, strategy, mode, market, symbol and positive capital are required", 400);
    }
    if (!["paper", "live"].includes(body.mode)) return fail("VALIDATION_ERROR", "Invalid deployment mode", 400);

    const { plan } = await getActivePlan();
    const active = await select(
      "algo_deployments",
      `owner_id=eq.${user.id}&status=eq.active&select=id`,
    );

    if (body.autoStart !== false && active.length >= plan.entitlements.concurrentStrategies) {
      return fail(
        "PLAN_LIMIT_REACHED",
        `Your ${plan.name} plan allows ${plan.entitlements.concurrentStrategies} concurrent strategies.`,
        403,
      );
    }

    const rows = await insert<Record<string, unknown>>("algo_deployments", {
      owner_id: user.id,
      name: String(body.name),
      strategy_id: String(body.strategyId),
      mode: body.mode,
      market: String(body.market),
      symbol: String(body.symbol),
      capital: Number(body.capital),
      status: body.autoStart === false ? "paused" : "active",
      risk_config: body.riskConfig ?? {},
    });
    return ok({ deployment: rows[0] }, 201);
  } catch (error) {
    return fail("DEPLOYMENT_CREATE_FAILED", error instanceof Error ? error.message : "Unable to create deployment", 400);
  }
}
