import { fail, ok } from "@/lib/security/api-response";
import { paperStore } from "@/lib/paper/paper-store";

export async function GET() {
  return ok(await paperStore.getAccount());
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as { startingBalance?: unknown } | null;
  const amount = Number(body?.startingBalance);
  if (!Number.isFinite(amount) || amount < 1000 || amount > 100_000_000) {
    return fail("VALIDATION_ERROR", "startingBalance must be between 1,000 and 100,000,000", 400);
  }
  try {
    return ok(await paperStore.setStartingBalance(amount));
  } catch (error) {
    return fail("PAPER_ACCOUNT_UPDATE_FAILED", error instanceof Error ? error.message : "Update failed", 409);
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { startingBalance?: unknown } | null;
  const raw = body?.startingBalance;
  const amount = raw == null ? undefined : Number(raw);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 1000 || amount > 100_000_000)) {
    return fail("VALIDATION_ERROR", "Invalid reset capital", 400);
  }
  return ok(await paperStore.resetAccount(amount));
}
