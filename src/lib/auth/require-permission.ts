import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase/server-auth";
import { hasPermission, type Permission } from "./permissions";

export async function requirePermission(permission: Permission) {
  const session = await getServerSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  if (!hasPermission(session.user.role, permission)) redirect("/unauthorized");
  return session;
}
