import { currentUser, insert, select } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

export async function POST(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  try {
    const user = await currentUser();
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { deploymentId?: string; confirmed?: boolean }
      | null;

    if (!body?.deploymentId || body.confirmed !== true)
      return fail(
        "CONFIRMATION_REQUIRED",
        "Deployment and explicit confirmation are required",
        400,
      );

    const opportunity = (
      await select(
        "agent_opportunities",
        `id=eq.${encodeURIComponent(opportunityId)}&status=eq.active&limit=1`,
      )
    )[0];

    if (!opportunity)
      return fail("OPPORTUNITY_NOT_FOUND", "Opportunity not found or expired", 404);

    const deployment = (
      await select(
        "algo_deployments",
        `id=eq.${encodeURIComponent(body.deploymentId)}&owner_id=eq.${user.id}&limit=1`,
      )
    )[0];

    if (!deployment)
      return fail(
        "DEPLOYMENT_NOT_FOUND",
        "Deployment not found for this account",
        404,
      );

    const existing = (
      await select(
        "execution_approvals",
        `owner_id=eq.${user.id}&deployment_id=eq.${encodeURIComponent(body.deploymentId)}&decision=eq.approved&order=created_at.desc&limit=1`,
      )
    )[0];

    if (existing)
      return ok({
        approval: existing,
        executionStarted: false,
        message:
          "Approval already exists. Live execution remains subject to Zerion execution policy, broker state and preflight.",
      });

    const rows = await insert<Record<string, unknown>>("execution_approvals", {
      owner_id: user.id,
      deployment_id: body.deploymentId,
      decision: "approved",
      confirmation: {
        source: "agent-opportunity",
        opportunityId,
        symbol: opportunity.symbol,
        direction: opportunity.direction,
        confidence: opportunity.confidence,
        confirmed: true,
      },
      approved_at: new Date().toISOString(),
    });

    return ok(
      {
        approval: rows[0],
        executionStarted: false,
        message:
          "Opportunity approved. No broker order was placed automatically. Existing execution policy and preflight remain mandatory.",
      },
      201,
    );
  } catch (error) {
    return fail(
      "OPPORTUNITY_APPROVAL_FAILED",
      error instanceof Error ? error.message : "Unable to approve opportunity",
      400,
    );
  }
}
