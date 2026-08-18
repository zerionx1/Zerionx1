import { DashboardShell } from "@/components/dashboard/shell";
import { UpgradeNudge } from "@/components/billing/upgrade-nudge";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function Layout({children}:{children:React.ReactNode}){
  await requirePermission("dashboard.read");
  return <DashboardShell>{children}<UpgradeNudge/></DashboardShell>;
}
