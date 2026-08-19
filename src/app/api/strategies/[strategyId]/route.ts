import { apiError, apiSuccess } from "@/lib/security/api-response";
import { getUserStrategy, saveUserStrategy } from "@/lib/strategy/strategy-repository";
import { currentUser, remove } from "@/lib/supabase/rest";
import { strategySchema } from "@/lib/validation/strategy";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) {
  const { strategyId } = await params;
  const strategy = await getUserStrategy(strategyId);
  return strategy
    ? apiSuccess({ strategy })
    : apiError("NOT_FOUND", "Strategy not found", 404);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) {
  const { strategyId } = await params;
  const parsed = strategySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError("VALIDATION_ERROR", "Invalid strategy definition", 400, parsed.error.flatten());
  if (parsed.data.id !== strategyId)
    return apiError("VALIDATION_ERROR", "Strategy id mismatch", 400);
  return apiSuccess({ strategy: await saveUserStrategy(parsed.data) });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) {
  const user = await currentUser();
  const { strategyId } = await params;

  await remove(
    "algo_deployments",
    `strategy_id=eq.${encodeURIComponent(strategyId)}&owner_id=eq.${user.id}`,
  );
  await remove(
    "strategies",
    `id=eq.${encodeURIComponent(strategyId)}&owner_id=eq.${user.id}`,
  );

  return apiSuccess({ deleted: true });
}
