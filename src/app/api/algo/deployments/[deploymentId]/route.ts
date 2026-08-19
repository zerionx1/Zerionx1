import { getActivePlan } from "@/lib/billing/plan-service";
import { currentUser, remove, select, update } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ deploymentId: string }> },
) {
  const user = await currentUser();
  const { deploymentId } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: "active" | "paused" | "stopped";
  } | null;

  if (!body?.status || !["active", "paused", "stopped"].includes(body.status))
    return fail("VALIDATION_ERROR", "Invalid deployment status", 400);

  if (body.status === "active") {
    const { plan } = await getActivePlan();
    const active = await select(
      "algo_deployments",
      `owner_id=eq.${user.id}&status=eq.active&id=neq.${encodeURIComponent(deploymentId)}&select=id`,
    );
    if (active.length >= plan.entitlements.concurrentStrategies)
      return fail(
        "PLAN_LIMIT_REACHED",
        `Your ${plan.name} plan allows ${plan.entitlements.concurrentStrategies} concurrent strategies.`,
        403,
      );
  }

  const rows = await update<Record<string, unknown>>(
    "algo_deployments",
    `id=eq.${encodeURIComponent(deploymentId)}&owner_id=eq.${user.id}`,
    { status: body.status, updated_at: new Date().toISOString() },
  );
  if (!rows[0]) return fail("NOT_FOUND", "Deployment not found", 404);
  return ok({ deployment: rows[0] });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ deploymentId: string }> },
) {
  const user = await currentUser();
  const { deploymentId } = await params;
  await remove(
    "algo_deployments",
    `id=eq.${encodeURIComponent(deploymentId)}&owner_id=eq.${user.id}`,
  );
  return ok({ deleted: true });
}
