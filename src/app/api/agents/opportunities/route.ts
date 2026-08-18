import { currentUser, select } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

export async function GET() {
  try {
    await currentUser();
    const now = new Date().toISOString();
    const rows = await select(
      "agent_opportunities",
      `status=eq.active&expires_at=gt.${encodeURIComponent(now)}&order=confidence.desc&limit=100`,
    );
    return ok({ opportunities: rows });
  } catch (error) {
    return fail(
      "OPPORTUNITIES_READ_FAILED",
      error instanceof Error ? error.message : "Unable to load opportunities",
      400,
    );
  }
}
