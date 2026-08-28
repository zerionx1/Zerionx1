import { currentUser, select } from "@/lib/supabase/rest";
import { fail, ok } from "@/lib/security/api-response";

export async function GET() {
  try {
    await currentUser();
    const now = new Date().toISOString();
    const rows = await select("agent_developing_setups", `expires_at=gt.${encodeURIComponent(now)}&order=quality_score.desc,confidence.desc&limit=20`);
    return ok({ setups: rows, executionPolicy: "watch-only", label: "Developing Setups" });
  } catch (error) {
    return fail("DEVELOPING_SETUPS_FAILED", error instanceof Error ? error.message : "Unable to load developing setups", 400);
  }
}
